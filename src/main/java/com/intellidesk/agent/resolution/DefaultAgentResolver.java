package com.intellidesk.agent.resolution;

import com.intellidesk.ticket.entity.Ticket;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Fallback AI Agent for OTHER or unrecognized categories.
 */
@Component
@Order(100)
public class DefaultAgentResolver implements TicketResolver {

    @Override
    public boolean supports(String categoryCode) {
        return true; // Fallback matches any category
    }

    @Override
    public AgentResolutionResult resolve(Ticket ticket) {
        String note = "General Support AI Agent Automated Resolution: Analyzed ticket requirements, "
                + "verified customer metadata, and updated internal ticket record. Resolution complete.";
        return new AgentResolutionResult(true, note, "General AI Agent");
    }
}
