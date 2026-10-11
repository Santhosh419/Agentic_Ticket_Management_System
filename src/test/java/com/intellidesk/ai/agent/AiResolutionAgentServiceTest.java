package com.intellidesk.ai.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.intellidesk.category.entity.Category;
import com.intellidesk.ecommerce.domain.OrderStatus;
import com.intellidesk.ecommerce.domain.PaymentStatus;
import com.intellidesk.ecommerce.entity.Order;
import com.intellidesk.ecommerce.entity.Product;
import com.intellidesk.ecommerce.repository.OrderRepository;
import com.intellidesk.ecommerce.service.EcommerceService;
import com.intellidesk.ticket.domain.TicketPriority;
import com.intellidesk.ticket.entity.Ticket;
import com.intellidesk.user.domain.Role;
import com.intellidesk.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiResolutionAgentServiceTest {

    @Mock private EcommerceService ecommerceService;
    @Mock private OrderRepository orderRepository;

    private AiToolRegistry toolRegistry;
    private AiResolutionProperties properties;
    private AiResolutionAgentService service;

    private User customer;
    private Order order;

    @BeforeEach
    void setUp() {
        toolRegistry = new AiToolRegistry(ecommerceService);
        properties = new AiResolutionProperties(false, "openai-compatible", null, "gpt-4o-mini", "https://api.openai.com/v1", 5000);
        service = new AiResolutionAgentService(toolRegistry, orderRepository, properties, RestClient.builder(), new ObjectMapper());

        customer = new User("cust@test.local", "hash", "Customer", null, Role.CUSTOMER);
        order = new Order("ORD-2026-1001", customer, OrderStatus.CONFIRMED, PaymentStatus.PAID,
                "CREDIT_CARD", "TXN-1", 199.99, "Address", "FedEx", "TRK-FDX-1001", Instant.now());
    }

    @Test
    void resolveTicket_paymentRefundIntent_executesProcessRefundTool() {
        Category category = new Category("PAYMENT", "Payment", "Payment issues");
        Ticket ticket = new Ticket("TKD-001", "Charged twice for ORD-2026-1001", "Money was debited two times",
                customer, category, TicketPriority.HIGH, null, null);

        when(orderRepository.findWithDetailsByOrderNumber("ORD-2026-1001")).thenReturn(Optional.of(order));
        when(ecommerceService.processRefund(eq("ORD-2026-1001"), any(), any()))
                .thenReturn(new EcommerceService.RefundResult(true, "REF-99201", 199.99, "Refund processed"));

        AiResolutionAgentService.AiResolutionOutcome outcome = service.resolveTicket(ticket);

        assertThat(outcome.success()).isTrue();
        assertThat(outcome.actionsTaken()).anyMatch(a -> a.contains("process_refund"));
        assertThat(outcome.resolutionNote()).contains("Refund will reflect in your account");
        verify(ecommerceService).processRefund(eq("ORD-2026-1001"), any(), any());
    }

    @Test
    void resolveTicket_cancelOrderIntent_executesCancelOrderTool() {
        Category category = new Category("ORDER", "Order", "Order issues");
        Ticket ticket = new Ticket("TKD-002", "Cancel my order ORD-2026-1001 please", "I ordered by mistake",
                customer, category, TicketPriority.MEDIUM, null, null);

        when(orderRepository.findWithDetailsByOrderNumber("ORD-2026-1001")).thenReturn(Optional.of(order));
        when(ecommerceService.cancelOrder(eq("ORD-2026-1001"), any()))
                .thenReturn(new EcommerceService.CancellationResult(true, "ORD-2026-1001", "Order cancelled"));

        AiResolutionAgentService.AiResolutionOutcome outcome = service.resolveTicket(ticket);

        assertThat(outcome.success()).isTrue();
        assertThat(outcome.actionsTaken()).anyMatch(a -> a.contains("cancel_order"));
        assertThat(outcome.resolutionNote()).contains("Order ORD-2026-1001 has been successfully cancelled");
        verify(ecommerceService).cancelOrder(eq("ORD-2026-1001"), any());
    }

    @Test
    void resolveTicket_deliveryTrackingIntent_executesSyncTrackingTool() {
        Category category = new Category("DELIVERY", "Delivery", "Delivery issues");
        Ticket ticket = new Ticket("TKD-003", "Where is package ORD-2026-1001?", "Delivery is taking time",
                customer, category, TicketPriority.MEDIUM, null, null);

        when(orderRepository.findWithDetailsByOrderNumber("ORD-2026-1001")).thenReturn(Optional.of(order));
        when(ecommerceService.syncCarrierTracking("ORD-2026-1001"))
                .thenReturn(new EcommerceService.TrackingResult(true, "FedEx", "TRK-FDX-1001", "In Transit at Hub", Instant.now()));

        AiResolutionAgentService.AiResolutionOutcome outcome = service.resolveTicket(ticket);

        assertThat(outcome.success()).isTrue();
        assertThat(outcome.actionsTaken()).anyMatch(a -> a.contains("sync_tracking"));
        assertThat(outcome.resolutionNote()).contains("Logistics AI Agent Automated Resolution");
        verify(ecommerceService).syncCarrierTracking("ORD-2026-1001");
    }

    @Test
    void resolveTicket_accountSecurity_resolvesWithoutOrder() {
        Category category = new Category("ACCOUNT", "Account", "Account issues");
        Ticket ticket = new Ticket("TKD-004", "Forgot password and locked out", "Cannot login to my account",
                customer, category, TicketPriority.MEDIUM, null, null);

        when(orderRepository.findByCustomerIdOrderByCreatedAtDesc(any())).thenReturn(List.of());

        AiResolutionAgentService.AiResolutionOutcome outcome = service.resolveTicket(ticket);

        assertThat(outcome.success()).isTrue();
        assertThat(outcome.resolutionNote()).contains("Account Security AI Agent Automated Resolution");
        assertThat(outcome.resolutionNote()).contains(customer.getEmail());
    }
}
