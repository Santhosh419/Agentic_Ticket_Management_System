package com.intellidesk.ecommerce.controller;

import com.intellidesk.ecommerce.dto.OrderResponse;
import com.intellidesk.ecommerce.dto.ProductResponse;
import com.intellidesk.ecommerce.service.EcommerceService;
import com.intellidesk.security.IntelliDeskUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "E-Commerce", description = "E-Commerce catalog, customer orders, and tracking integration")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/ecommerce")
public class EcommerceController {

    private final EcommerceService ecommerceService;

    public EcommerceController(EcommerceService ecommerceService) {
        this.ecommerceService = ecommerceService;
    }

    @Operation(summary = "Get product catalog (Public / Authenticated)")
    @GetMapping("/products")
    public List<ProductResponse> products() {
        return ecommerceService.getActiveProducts();
    }

    @Operation(summary = "Get caller's own orders (CUSTOMER)")
    @GetMapping("/orders/my")
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<OrderResponse> myOrders(@AuthenticationPrincipal IntelliDeskUserDetails principal) {
        return ecommerceService.getOrdersForCustomer(principal.getUser());
    }

    @Operation(summary = "Get all orders (AGENT / ADMIN)")
    @GetMapping("/orders")
    @PreAuthorize("hasAnyRole('AGENT', 'ADMIN')")
    public List<OrderResponse> allOrders(@AuthenticationPrincipal IntelliDeskUserDetails principal) {
        return ecommerceService.getAllOrders(principal.getUser());
    }

    @Operation(summary = "Get order by ID (Owner CUSTOMER, or AGENT / ADMIN)")
    @GetMapping("/orders/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'ADMIN')")
    public OrderResponse getById(@PathVariable Long id,
                                 @AuthenticationPrincipal IntelliDeskUserDetails principal) {
        return ecommerceService.getOrderById(id, principal.getUser());
    }

    @Operation(summary = "Get order by order number (Owner CUSTOMER, or AGENT / ADMIN)")
    @GetMapping("/orders/by-number/{orderNumber}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'ADMIN')")
    public OrderResponse getByOrderNumber(@PathVariable String orderNumber,
                                           @AuthenticationPrincipal IntelliDeskUserDetails principal) {
        return ecommerceService.getOrderByOrderNumber(orderNumber, principal.getUser());
    }
}
