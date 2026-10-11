package com.intellidesk.ecommerce.repository;

import com.intellidesk.ecommerce.entity.Order;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderNumber(String orderNumber);

    boolean existsByOrderNumber(String orderNumber);

    @EntityGraph(attributePaths = {"items", "items.product", "customer"})
    Optional<Order> findWithDetailsById(Long id);

    @EntityGraph(attributePaths = {"items", "items.product", "customer"})
    Optional<Order> findWithDetailsByOrderNumber(String orderNumber);

    @EntityGraph(attributePaths = {"items", "customer"})
    List<Order> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    @EntityGraph(attributePaths = {"items", "customer"})
    List<Order> findAllByOrderByCreatedAtDesc();
}
