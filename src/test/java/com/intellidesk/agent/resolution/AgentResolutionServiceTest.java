package com.intellidesk.agent.resolution;

import com.intellidesk.category.entity.Category;
import com.intellidesk.ticket.domain.TicketPriority;
import com.intellidesk.ticket.domain.TicketStatus;
import com.intellidesk.ticket.entity.Ticket;
import com.intellidesk.ticket.repository.TicketRepository;
import com.intellidesk.ticket.service.TicketWorkflowService;
import com.intellidesk.user.domain.Role;
import com.intellidesk.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgentResolutionServiceTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private TicketWorkflowService workflowService;

    private AgentResolutionService service;

    @BeforeEach
    void setUp() {
        List<TicketResolver> resolvers = List.of(
                new PaymentAgentResolver(),
                new AccountAgentResolver(),
                new TechnicalAgentResolver(),
                new OrderAgentResolver(),
                new DefaultAgentResolver()
        );
        service = new AgentResolutionService(ticketRepository, workflowService, resolvers);
    }

    @Test
    void autoResolveTicket_paymentCategory_usesPaymentAgent() {
        User customer = new User("cust@test.local", "hash", "Customer", null, Role.CUSTOMER);
        Category category = new Category("PAYMENT", "Payment", "Payment issues");
        Ticket ticket = new Ticket("TKD-001", "Payment Failure", "Double debited", customer, category, TicketPriority.HIGH, null, null);

        when(ticketRepository.findWithDetailsById(1L)).thenReturn(Optional.of(ticket));
        when(workflowService.transition(eq(1L), eq(TicketStatus.RESOLVED), eq(customer), any(), any()))
                .thenReturn(ticket);

        Ticket result = service.autoResolveTicket(1L, customer);

        assertThat(result).isNotNull();
        verify(workflowService).transition(
                eq(1L),
                eq(TicketStatus.RESOLVED),
                eq(customer),
                eq("Automated resolution by Payment AI Agent"),
                org.mockito.ArgumentMatchers.contains("Payment AI Agent Automated Resolution")
        );
    }

    @Test
    void autoResolveTicket_accountCategory_usesAccountAgent() {
        User customer = new User("cust@test.local", "hash", "Customer", null, Role.CUSTOMER);
        Category category = new Category("ACCOUNT", "Account", "Account issues");
        Ticket ticket = new Ticket("TKD-002", "Password Reset", "Forgot password", customer, category, TicketPriority.MEDIUM, null, null);

        when(ticketRepository.findWithDetailsById(2L)).thenReturn(Optional.of(ticket));
        when(workflowService.transition(eq(2L), eq(TicketStatus.RESOLVED), eq(customer), any(), any()))
                .thenReturn(ticket);

        Ticket result = service.autoResolveTicket(2L, customer);

        assertThat(result).isNotNull();
        verify(workflowService).transition(
                eq(2L),
                eq(TicketStatus.RESOLVED),
                eq(customer),
                eq("Automated resolution by Account AI Agent"),
                org.mockito.ArgumentMatchers.contains("Account Security AI Agent Automated Resolution")
        );
    }
}
