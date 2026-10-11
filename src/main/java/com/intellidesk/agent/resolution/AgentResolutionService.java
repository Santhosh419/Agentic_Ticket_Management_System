package com.intellidesk.agent.resolution;

import com.intellidesk.common.exception.ResourceNotFoundException;
import com.intellidesk.ticket.domain.TicketStatus;
import com.intellidesk.ticket.entity.Ticket;
import com.intellidesk.ticket.repository.TicketRepository;
import com.intellidesk.ticket.service.TicketWorkflowService;
import com.intellidesk.user.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Orchestrator service for specialized domain AI resolution agents.
 */
@Service
public class AgentResolutionService {

    private static final Logger log = LoggerFactory.getLogger(AgentResolutionService.class);

    private final TicketRepository ticketRepository;
    private final TicketWorkflowService workflowService;
    private final List<TicketResolver> resolvers;
    private final com.intellidesk.ai.agent.AiResolutionAgentService aiResolutionAgentService;

    public AgentResolutionService(TicketRepository ticketRepository,
                                  TicketWorkflowService workflowService,
                                  List<TicketResolver> resolvers) {
        this(ticketRepository, workflowService, resolvers, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public AgentResolutionService(TicketRepository ticketRepository,
                                  TicketWorkflowService workflowService,
                                  List<TicketResolver> resolvers,
                                  @org.springframework.beans.factory.annotation.Autowired(required = false)
                                  com.intellidesk.ai.agent.AiResolutionAgentService aiResolutionAgentService) {
        this.ticketRepository = ticketRepository;
        this.workflowService = workflowService;
        this.resolvers = resolvers;
        this.aiResolutionAgentService = aiResolutionAgentService;
    }

    @Transactional
    public Ticket autoResolveTicket(Long ticketId, User actor) {
        Ticket ticket = ticketRepository.findWithDetailsById(ticketId)
                .orElseThrow(() -> ResourceNotFoundException.of("Ticket", ticketId));

        String categoryCode = ticket.getCategory() != null ? ticket.getCategory().getCode() : "OTHER";

        TicketResolver resolver = resolvers.stream()
                .filter(r -> r.supports(categoryCode))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No resolver agent found for category " + categoryCode));

        log.info("Dispatching ticket {} (category={}) to specialized agent {}",
                ticket.getTicketNumber(), categoryCode, resolver.getClass().getSimpleName());

        AgentResolutionResult result;
        if (aiResolutionAgentService != null) {
            com.intellidesk.ai.agent.AiResolutionAgentService.AiResolutionOutcome outcome =
                    aiResolutionAgentService.resolveTicket(ticket);
            result = new AgentResolutionResult(outcome.success(), outcome.resolutionNote(), outcome.agentName());
        } else {
            result = resolver.resolve(ticket);
        }

        // If ticket is OPEN or ASSIGNED, step through IN_PROGRESS to satisfy domain state machine rules
        if (ticket.getStatus() == TicketStatus.OPEN || ticket.getStatus() == TicketStatus.ASSIGNED) {
            if (ticket.getStatus() == TicketStatus.OPEN && actor.getRole() == com.intellidesk.user.domain.Role.ADMIN) {
                // If OPEN, assign to admin or step to IN_PROGRESS
                ticket = workflowService.transition(ticketId, TicketStatus.ASSIGNED, actor, "AI Agent pickup");
            }
            if (ticket.getStatus() == TicketStatus.ASSIGNED) {
                ticket = workflowService.transition(ticketId, TicketStatus.IN_PROGRESS, actor, "AI Agent working");
            }
        }

        // Transition to RESOLVED + audit trail recording
        Ticket resolved = workflowService.transition(
                ticketId,
                TicketStatus.RESOLVED,
                actor,
                "Automated resolution by " + result.agentName(),
                result.resolutionNote()
        );

        log.info("Ticket {} successfully resolved by {}", resolved.getTicketNumber(), result.agentName());
        return resolved;
    }
}
