package com.intellidesk.ecommerce.domain;

/**
 * Payment processing states of an e-commerce order.
 */
public enum PaymentStatus {
    PENDING,
    PAID,
    FAILED,
    REFUNDED
}
