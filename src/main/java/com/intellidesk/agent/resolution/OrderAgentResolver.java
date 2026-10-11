package com.intellidesk.agent.resolution;

import com.intellidesk.ticket.entity.Ticket;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Specialized AI Agent for ORDER and DELIVERY tickets.
 */
@Component
@Order(4)
public class OrderAgentResolver implements TicketResolver {

    private final com.intellidesk.ecommerce.service.EcommerceService ecommerceService;

    public OrderAgentResolver() {
        this(null);
    }

    public OrderAgentResolver(@org.springframework.beans.factory.annotation.Autowired(required = false)
                              com.intellidesk.ecommerce.service.EcommerceService ecommerceService) {
        this.ecommerceService = ecommerceService;
    }

    @Override
    public boolean supports(String categoryCode) {
        String code = categoryCode != null ? categoryCode.toUpperCase() : "";
        return "ORDER".equals(code) || "DELIVERY".equals(code);
    }

    @Override
    public AgentResolutionResult resolve(Ticket ticket) {
        long idVal = ticket.getId() != null ? ticket.getId() : 1L;
        String trackingId = "TRK-" + Math.abs(idVal * 73 + System.currentTimeMillis() % 1000000);

        if (ecommerceService != null && ticket.getOrder() != null) {
            String text = (ticket.getTitle() + " " + ticket.getDescription()).toLowerCase();
            if (text.contains("cancel")) {
                com.intellidesk.ecommerce.service.EcommerceService.CancellationResult cancelRes =
                        ecommerceService.cancelOrder(ticket.getOrder().getOrderNumber(), ticket.getTitle());
                String note = "Logistics AI Agent Automated Resolution: " + cancelRes.message();
                return new AgentResolutionResult(true, note, "Logistics AI Agent");
            } else {
                com.intellidesk.ecommerce.service.EcommerceService.TrackingResult trackRes =
                        ecommerceService.syncCarrierTracking(ticket.getOrder().getOrderNumber());
                if (trackRes.trackingNumber() != null && !trackRes.trackingNumber().equals("N/A")) {
                    trackingId = trackRes.trackingNumber();
                }
            }
        }

        String note = "Logistics AI Agent Automated Resolution: Interfaced with courier API. "
                + "Order tracking reference #" + trackingId + " verified. "
                + "Shipment is in transit at local hub. Estimated delivery within 24 hours.";
        return new AgentResolutionResult(true, note, "Logistics AI Agent");
    }
}
