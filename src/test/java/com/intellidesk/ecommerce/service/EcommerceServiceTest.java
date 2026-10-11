package com.intellidesk.ecommerce.service;

import com.intellidesk.ecommerce.domain.OrderStatus;
import com.intellidesk.ecommerce.domain.PaymentStatus;
import com.intellidesk.ecommerce.entity.Order;
import com.intellidesk.ecommerce.entity.OrderItem;
import com.intellidesk.ecommerce.entity.Product;
import com.intellidesk.ecommerce.repository.OrderRepository;
import com.intellidesk.ecommerce.repository.ProductRepository;
import com.intellidesk.user.domain.Role;
import com.intellidesk.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EcommerceServiceTest {

    @Mock private ProductRepository productRepository;
    @Mock private OrderRepository orderRepository;

    @InjectMocks private EcommerceService ecommerceService;

    private User customer;
    private Product product;
    private Order order;

    @BeforeEach
    void setUp() {
        customer = new User("cust@test.local", "hash", "Customer", null, Role.CUSTOMER);
        product = new Product("SKU-HP-1", "Headphones", "Desc", 199.99, "ELECTRONICS", 10);
        order = new Order("ORD-1001", customer, OrderStatus.CONFIRMED, PaymentStatus.PAID,
                "CREDIT_CARD", "TXN-1", 199.99, "Address", "FedEx", "TRK-1001", Instant.now());
        order.addItem(new OrderItem(product, product.getName(), product.getPrice(), 1));
    }

    @Test
    void processRefund_updatesPaymentAndOrderStatus() {
        when(orderRepository.findWithDetailsByOrderNumber("ORD-1001")).thenReturn(Optional.of(order));

        EcommerceService.RefundResult result = ecommerceService.processRefund("ORD-1001", "Double charge", null);

        assertThat(result.success()).isTrue();
        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.REFUNDED);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.REFUNDED);
        assertThat(order.getNotes()).contains("Double charge");
        verify(orderRepository).save(order);
    }

    @Test
    void cancelOrder_confirmedOrder_cancelsAndRestocks() {
        when(orderRepository.findWithDetailsByOrderNumber("ORD-1001")).thenReturn(Optional.of(order));

        EcommerceService.CancellationResult result = ecommerceService.cancelOrder("ORD-1001", "Changed mind");

        assertThat(result.success()).isTrue();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(order.getPaymentStatus()).isEqualTo(PaymentStatus.REFUNDED);
        assertThat(product.getStockQuantity()).isEqualTo(11); // Restocked 10 + 1
        verify(orderRepository).save(order);
        verify(productRepository).save(product);
    }

    @Test
    void cancelOrder_shippedOrder_refusesCancellation() {
        order.setStatus(OrderStatus.SHIPPED);
        when(orderRepository.findWithDetailsByOrderNumber("ORD-1001")).thenReturn(Optional.of(order));

        EcommerceService.CancellationResult result = ecommerceService.cancelOrder("ORD-1001", "Changed mind");

        assertThat(result.success()).isFalse();
        assertThat(result.message()).contains("Cannot cancel order: package is already SHIPPED");
    }

    @Test
    void syncCarrierTracking_updatesTelemetryAndEta() {
        when(orderRepository.findWithDetailsByOrderNumber("ORD-1001")).thenReturn(Optional.of(order));

        EcommerceService.TrackingResult result = ecommerceService.syncCarrierTracking("ORD-1001");

        assertThat(result.success()).isTrue();
        assertThat(result.carrier()).isEqualTo("FedEx");
        assertThat(result.trackingNumber()).isEqualTo("TRK-1001");
        assertThat(order.getNotes()).contains("Regional Logistics Hub");
        verify(orderRepository).save(order);
    }

    @Test
    void issueStoreCredit_generatesVoucher() {
        EcommerceService.StoreCreditResult result = ecommerceService.issueStoreCredit(1L, 50.0, "Courtesy");

        assertThat(result.success()).isTrue();
        assertThat(result.voucherCode()).startsWith("CREDIT-50-");
        assertThat(result.amount()).isEqualTo(50.0);
    }
}
