package com.intellidesk.agent.resolution;

import com.intellidesk.ticket.entity.Ticket;

/**
 * Interface for specialized AI domain resolution agents (Payment, Account, Technical, Order/Delivery).
 */
public interface TicketResolver {

    /** Returns true if this agent handles the given category code. */
    boolean supports(String categoryCode);

    /** Executes domain resolution logic on the ticket. */
    AgentResolutionResult resolve(Ticket ticket);
}
