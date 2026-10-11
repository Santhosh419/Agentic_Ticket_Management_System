package com.intellidesk.ecommerce.dto;

public record OrderItemResponse(
        Long id,
        Long productId,
        String productName,
        Double unitPrice,
        Integer quantity,
        Double subtotal
) {}
