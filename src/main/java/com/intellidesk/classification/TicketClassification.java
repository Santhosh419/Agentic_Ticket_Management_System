package com.intellidesk.classification;

import com.intellidesk.classification.domain.Sentiment;
import com.intellidesk.ticket.domain.TicketPriority;

/**
 * The result of classifying one ticket text, regardless of WHO classified it
 * (rule engine, Make.com scenario, or n8n workflow).
 *
 * @param categoryCode      seeded category code such as {@code PAYMENT}; the
 *                          service layer resolves it to the entity
 * @param priority          suggested support priority
 * @param sentiment         detected customer sentiment
 * @param suggestedResponse internal agent hint or auto-resolution text
 * @param autoResolve       when true, triggers immediate autonomous ticket resolution
 */
public record TicketClassification(
        String categoryCode,
        TicketPriority priority,
        Sentiment sentiment,
        String suggestedResponse,
        boolean autoResolve
) {

    public TicketClassification(String categoryCode, TicketPriority priority, Sentiment sentiment, String suggestedResponse) {
        this(categoryCode, priority, sentiment, suggestedResponse, false);
    }

    /**
     * Safe default used when classification is unavailable or fails: the ticket
     * lands in the general queue with a medium priority instead of the request
     * failing. Part of the availability contract - see
     * {@code TicketService#classifySafely}.
     */
    public static TicketClassification fallback() {
        return new TicketClassification("OTHER", TicketPriority.MEDIUM, Sentiment.NEUTRAL, null, false);
    }
}
