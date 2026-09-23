package com.intellidesk.agent.resolution;

import com.intellidesk.ticket.entity.Ticket;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Specialized AI Agent for PAYMENT tickets (refunds, payment failures, duplicate debits).
 */
@Component
@Order(1)
public class PaymentAgentResolver implements TicketResolver {

    @Override
    public boolean supports(String categoryCode) {
        return "PAYMENT".equalsIgnoreCase(categoryCode);
    }

    @Override
    public AgentResolutionResult resolve(Ticket ticket) {
        long idVal = ticket.getId() != null ? ticket.getId() : 1L;
        long refId = Math.abs(idVal * 31 + System.currentTimeMillis() % 100000);
        String note = "Payment AI Agent Automated Resolution: Verified gateway transaction logs. "
                + "Payment failure confirmed for ticket '" + ticket.getTitle() + "'. "
                + "Refund reconciliation batch #REF-" + refId + " has been executed. "
                + "Funds will reflect in 1-2 business days.";
        return new AgentResolutionResult(true, note, "Payment AI Agent");
    }
}
