package com.intellidesk.ai.agent;

import com.intellidesk.ecommerce.entity.Order;
import com.intellidesk.ecommerce.service.EcommerceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Registry of executable domain actions/tools that the AI Resolution Agent
 * can invoke to diagnose and fix e-commerce customer issues.
 */
@Component
public class AiToolRegistry {

    private static final Logger log = LoggerFactory.getLogger(AiToolRegistry.class);

    private final EcommerceService ecommerceService;

    public record ToolResult(boolean success, String actionName, String output) {}

    public AiToolRegistry(EcommerceService ecommerceService) {
        this.ecommerceService = ecommerceService;
    }

    /**
     * Executes a tool by name with provided arguments.
     */
    public ToolResult executeTool(String toolName, Map<String, Object> params) {
        log.info("AI Agent invoking tool '{}' with params: {}", toolName, params);
        try {
            return switch (toolName) {
                case "lookup_order" -> lookupOrder(params);
                case "process_refund" -> processRefund(params);
                case "cancel_order" -> cancelOrder(params);
                case "sync_tracking" -> syncTracking(params);
                case "issue_store_credit" -> issueStoreCredit(params);
                default -> new ToolResult(false, toolName, "Unknown tool: " + toolName);
            };
        } catch (Exception ex) {
            log.error("Tool execution failed for {}: {}", toolName, ex.getMessage(), ex);
            return new ToolResult(false, toolName, "Tool execution error: " + ex.getMessage());
        }
    }

    private ToolResult lookupOrder(Map<String, Object> params) {
        String orderNumber = String.valueOf(params.getOrDefault("orderNumber", "")).trim();
        Order order = ecommerceService.findOrderEntity(orderNumber);
        if (order == null) {
            return new ToolResult(false, "lookup_order", "Order '" + orderNumber + "' not found.");
        }
        String output = String.format("Order: %s | Status: %s | Payment: %s | Total: $%.2f | Carrier: %s | Tracking: %s | EstDelivery: %s",
                order.getOrderNumber(), order.getStatus(), order.getPaymentStatus(),
                order.getTotalAmount(), order.getCarrier(), order.getTrackingNumber(),
                order.getEstimatedDeliveryAt());
        return new ToolResult(true, "lookup_order", output);
    }

    private ToolResult processRefund(Map<String, Object> params) {
        String orderNumber = String.valueOf(params.getOrDefault("orderNumber", "")).trim();
        String reason = String.valueOf(params.getOrDefault("reason", "AI Automated Resolution"));
        Double amount = null;
        if (params.containsKey("amount") && params.get("amount") != null) {
            try {
                amount = Double.parseDouble(String.valueOf(params.get("amount")));
            } catch (NumberFormatException ignored) {}
        }

        EcommerceService.RefundResult res = ecommerceService.processRefund(orderNumber, reason, amount);
        return new ToolResult(res.success(), "process_refund", res.message() + " (Batch: " + res.refundBatchId() + ")");
    }

    private ToolResult cancelOrder(Map<String, Object> params) {
        String orderNumber = String.valueOf(params.getOrDefault("orderNumber", "")).trim();
        String reason = String.valueOf(params.getOrDefault("reason", "Customer Requested Cancellation"));
        EcommerceService.CancellationResult res = ecommerceService.cancelOrder(orderNumber, reason);
        return new ToolResult(res.success(), "cancel_order", res.message());
    }

    private ToolResult syncTracking(Map<String, Object> params) {
        String orderNumber = String.valueOf(params.getOrDefault("orderNumber", "")).trim();
        EcommerceService.TrackingResult res = ecommerceService.syncCarrierTracking(orderNumber);
        String output = String.format("Carrier: %s | Tracking: %s | Checkpoint: %s | ETA: %s",
                res.carrier(), res.trackingNumber(), res.checkpoint(), res.estimatedDelivery());
        return new ToolResult(res.success(), "sync_tracking", output);
    }

    private ToolResult issueStoreCredit(Map<String, Object> params) {
        Long customerId = 1L;
        if (params.containsKey("customerId") && params.get("customerId") != null) {
            try {
                customerId = Long.parseLong(String.valueOf(params.get("customerId")));
            } catch (NumberFormatException ignored) {}
        }
        Double amount = 25.0;
        if (params.containsKey("amount") && params.get("amount") != null) {
            try {
                amount = Double.parseDouble(String.valueOf(params.get("amount")));
            } catch (NumberFormatException ignored) {}
        }
        String reason = String.valueOf(params.getOrDefault("reason", "Courtesy resolution voucher"));
        EcommerceService.StoreCreditResult res = ecommerceService.issueStoreCredit(customerId, amount, reason);
        return new ToolResult(res.success(), "issue_store_credit", res.message());
    }

    public Map<String, String> getAvailableToolDescriptions() {
        Map<String, String> tools = new LinkedHashMap<>();
        tools.put("lookup_order", "Inspects order items, payment status, and delivery tracking info. Param: orderNumber.");
        tools.put("process_refund", "Executes automated refund and updates order & payment status. Params: orderNumber, reason, amount (optional).");
        tools.put("cancel_order", "Cancels order and restocks products if order has not yet shipped. Params: orderNumber, reason.");
        tools.put("sync_tracking", "Refreshes live carrier tracking telemetry and updates delivery ETA. Param: orderNumber.");
        tools.put("issue_store_credit", "Issues compensatory courtesy credit voucher code for delays/defects. Params: customerId, amount, reason.");
        return tools;
    }
}
