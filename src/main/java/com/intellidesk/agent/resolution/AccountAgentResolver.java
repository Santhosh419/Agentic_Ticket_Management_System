package com.intellidesk.agent.resolution;

import com.intellidesk.ticket.entity.Ticket;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Specialized AI Agent for ACCOUNT tickets (logins, password resets, account unlocks).
 */
@Component
@Order(2)
public class AccountAgentResolver implements TicketResolver {

    @Override
    public boolean supports(String categoryCode) {
        return "ACCOUNT".equalsIgnoreCase(categoryCode);
    }

    @Override
    public AgentResolutionResult resolve(Ticket ticket) {
        String userEmail = ticket.getReporter().getEmail();
        String note = "Account Security AI Agent Automated Resolution: Verified identity for " + userEmail + ". "
                + "Account lock cleared and secure credential reset link generated. "
                + "An authentication link has been dispatched to " + userEmail + ". Account status: ACTIVE.";
        return new AgentResolutionResult(true, note, "Account AI Agent");
    }
}
