package com.intellidesk.ecommerce.dto;

public record ProductResponse(
        Long id,
        String sku,
        String name,
        String description,
        Double price,
        String category,
        Integer stockQuantity
) {}
