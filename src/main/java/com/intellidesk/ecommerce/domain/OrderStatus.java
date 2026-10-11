package com.intellidesk.ecommerce.domain;

/**
 * Lifecycle states of an e-commerce order.
 */
public enum OrderStatus {
    PENDING,
    CONFIRMED,
    SHIPPED,
    DELIVERED,
    CANCELLED,
    REFUNDED
}
