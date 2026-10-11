package com.intellidesk.config;

import com.intellidesk.category.entity.Category;
import com.intellidesk.category.repository.CategoryRepository;
import com.intellidesk.ecommerce.domain.OrderStatus;
import com.intellidesk.ecommerce.domain.PaymentStatus;
import com.intellidesk.ecommerce.entity.Order;
import com.intellidesk.ecommerce.entity.OrderItem;
import com.intellidesk.ecommerce.entity.Product;
import com.intellidesk.ecommerce.repository.OrderRepository;
import com.intellidesk.ecommerce.repository.ProductRepository;
import com.intellidesk.sla.entity.SlaPolicy;
import com.intellidesk.sla.repository.SlaPolicyRepository;
import com.intellidesk.ticket.domain.TicketPriority;
import com.intellidesk.user.domain.Role;
import com.intellidesk.user.entity.User;
import com.intellidesk.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Idempotent bootstrap data: support categories, SLA policies and the first
 * admin account.
 *
 * <p>Idempotency matters: this runs on EVERY startup (and in every test
 * context), so each step checks "already there?" before inserting. The admin
 * password comes from configuration/env vars and is stored BCrypt-hashed;
 * the logged warning reminds operators to override the default.</p>
 */
@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    /** code, name, description */
    private record SeedCategory(String code, String name, String description) {}

    private static final List<SeedCategory> CATEGORIES = List.of(
            new SeedCategory("PAYMENT", "Payment",
                    "Payment failures, refunds, duplicate charges, invoice issues"),
            new SeedCategory("ACCOUNT", "Account",
                    "Login problems, profile updates, account access"),
            new SeedCategory("TECHNICAL", "Technical",
                    "Bugs, errors, performance problems, integrations"),
            new SeedCategory("SECURITY", "Security",
                    "Suspicious activity, phishing reports, data privacy concerns"),
            new SeedCategory("ORDER", "Order",
                    "Order placement, modification and cancellation issues"),
            new SeedCategory("DELIVERY", "Delivery",
                    "Shipping delays, lost parcels, wrong items delivered"),
            new SeedCategory("OTHER", "Other",
                    "Anything that does not fit another category")
    );

    private final CategoryRepository categoryRepository;
    private final SlaPolicyRepository slaPolicyRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;

    private final String adminEmail;
    private final String adminPassword;
    private final String adminName;

    public DataSeeder(CategoryRepository categoryRepository,
                      SlaPolicyRepository slaPolicyRepository,
                      UserRepository userRepository,
                      PasswordEncoder passwordEncoder,
                      ProductRepository productRepository,
                      OrderRepository orderRepository,
                      @Value("${intellidesk.seed.admin-email:admin@intellidesk.local}") String adminEmail,
                      @Value("${intellidesk.seed.admin-password:Admin@12345}") String adminPassword,
                      @Value("${intellidesk.seed.admin-name:System Administrator}") String adminName) {
        this.categoryRepository = categoryRepository;
        this.slaPolicyRepository = slaPolicyRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.adminName = adminName;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedCategories();
        seedSlaPolicies();
        seedAdminUser();
        seedEcommerceData();
    }

    private void seedCategories() {
        int created = 0;
        for (SeedCategory seed : CATEGORIES) {
            if (categoryRepository.existsByCode(seed.code())) {
                continue;
            }
            categoryRepository.save(new Category(seed.code(), seed.name(), seed.description()));
            created++;
        }
        if (created > 0) {
            log.info("Seeded {} support categories", created);
        }
    }

    private void seedSlaPolicies() {
        int created = 0;
        for (TicketPriority priority : TicketPriority.values()) {
            if (slaPolicyRepository.findByPriorityAndActiveTrue(priority).isPresent()) {
                continue;
            }
            slaPolicyRepository.save(new SlaPolicy(priority, hoursFor(priority)));
            created++;
        }
        if (created > 0) {
            log.info("Seeded {} SLA policies", created);
        }
    }

    private static int hoursFor(TicketPriority priority) {
        // Single definition of the SLA targets; also documented in the README.
        return switch (priority) {
            case CRITICAL -> 2;
            case HIGH -> 8;
            case MEDIUM -> 24;
            case LOW -> 48;
        };
    }

    private void seedAdminUser() {
        String email = adminEmail.trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            return;
        }
        userRepository.save(new User(
                email,
                passwordEncoder.encode(adminPassword),
                adminName,
                null,
                Role.ADMIN
        ));
        log.warn("Seeded initial admin account '{}'. Change its password immediately "
                + "or set INTELLIDESK_ADMIN_EMAIL / INTELLIDESK_ADMIN_PASSWORD.", email);
    }

    private void seedEcommerceData() {
        // 1. Seed Products
        Product p1 = seedProduct("SKU-HEADPHONES-PRO", "Noise-Cancelling Wireless Headphones",
                "Over-ear active noise cancelling headphones with 30h battery", 199.99, "ELECTRONICS", 45);
        Product p2 = seedProduct("SKU-SMARTWATCH-ULTRA", "Ultra GPS Smartwatch",
                "Rugged titanium smartwatch with heart-rate and GPS tracking", 249.50, "ELECTRONICS", 30);
        Product p3 = seedProduct("SKU-MECH-KEYBOARD", "RGB Mechanical Gaming Keyboard",
                "Hot-swappable mechanical switches with per-key RGB lighting", 89.00, "ACCESSORIES", 75);
        Product p4 = seedProduct("SKU-ERGONOMIC-CHAIR", "Executive Ergonomic Office Chair",
                "High back lumbar support mesh chair with adjustable armrests", 320.00, "FURNITURE", 12);
        Product p5 = seedProduct("SKU-USBC-HUB-7IN1", "7-in-1 USB-C Power Delivery Hub",
                "HDMI 4K, 100W PD charging, SD card slot, 3x USB 3.0", 45.00, "ACCESSORIES", 110);

        // 2. Seed Demo Customer (Riya Sharma)
        String customerEmail = "riya@example.com";
        User customer = userRepository.findByEmail(customerEmail).orElseGet(() -> {
            User newUser = new User(
                    customerEmail,
                    passwordEncoder.encode("Passw0rd123"),
                    "Riya Sharma",
                    "+1-555-0199",
                    Role.CUSTOMER
            );
            return userRepository.save(newUser);
        });

        // 3. Seed Demo Orders for Customer
        if (!orderRepository.existsByOrderNumber("ORD-2026-1001")) {
            Order o1 = new Order(
                    "ORD-2026-1001", customer, OrderStatus.CONFIRMED, PaymentStatus.PAID,
                    "CREDIT_CARD", "TXN-8829101", 199.99,
                    "742 Evergreen Terrace, Springfield", "FedEx", "TRK-FDX-1001",
                    Instant.now().plus(2, ChronoUnit.DAYS)
            );
            o1.addItem(new OrderItem(p1, p1.getName(), p1.getPrice(), 1));
            orderRepository.save(o1);
        }

        if (!orderRepository.existsByOrderNumber("ORD-2026-1002")) {
            Order o2 = new Order(
                    "ORD-2026-1002", customer, OrderStatus.SHIPPED, PaymentStatus.PAID,
                    "CREDIT_CARD", "TXN-8829102", 249.50,
                    "742 Evergreen Terrace, Springfield", "FedEx", "TRK-FDX-9948201",
                    Instant.now().plus(1, ChronoUnit.DAYS)
            );
            o2.addItem(new OrderItem(p2, p2.getName(), p2.getPrice(), 1));
            orderRepository.save(o2);
        }

        if (!orderRepository.existsByOrderNumber("ORD-2026-1003")) {
            Order o3 = new Order(
                    "ORD-2026-1003", customer, OrderStatus.PENDING, PaymentStatus.FAILED,
                    "UPI", "TXN-FAIL-8829103", 89.00,
                    "742 Evergreen Terrace, Springfield", null, null, null
            );
            o3.addItem(new OrderItem(p3, p3.getName(), p3.getPrice(), 1));
            orderRepository.save(o3);
        }

        if (!orderRepository.existsByOrderNumber("ORD-2026-1004")) {
            Order o4 = new Order(
                    "ORD-2026-1004", customer, OrderStatus.DELIVERED, PaymentStatus.PAID,
                    "NET_BANKING", "TXN-8829104", 320.00,
                    "742 Evergreen Terrace, Springfield", "DHL", "TRK-DHL-1102948",
                    Instant.now().minus(3, ChronoUnit.DAYS)
            );
            o4.addItem(new OrderItem(p4, p4.getName(), p4.getPrice(), 1));
            orderRepository.save(o4);
        }

        log.info("E-Commerce catalog and demo orders seeded successfully for customer '{}'", customerEmail);
    }

    private Product seedProduct(String sku, String name, String description, Double price, String category, int stock) {
        return productRepository.findBySku(sku).orElseGet(() ->
                productRepository.save(new Product(sku, name, description, price, category, stock))
        );
    }
}
