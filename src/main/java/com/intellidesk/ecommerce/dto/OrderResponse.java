package com.intellidesk.ecommerce.dto;

import com.intellidesk.ecommerce.domain.OrderStatus;
import com.intellidesk.ecommerce.domain.PaymentStatus;

import java.time.Instant;
import java.util.List;

public record OrderResponse(
        Long id,
        String orderNumber,
        Long customerId,
        String customerName,
        OrderStatus status,
        PaymentStatus paymentStatus,
        String paymentMethod,
        String paymentTransactionId,
        Double totalAmount,
        String shippingAddress,
        String carrier,
        String trackingNumber,
        Instant estimatedDeliveryAt,
        String notes,
        Instant createdAt,
        List<OrderItemResponse> items
) {}
