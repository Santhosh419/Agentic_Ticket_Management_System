# IntelliDesk

## AI-Assisted IT Support & Ticket Resolution Platform

IntelliDesk is a production-style **Spring Boot backend** for IT/customer support:
customers raise tickets, the system classifies them (category, priority, sentiment,
suggested response) through a replaceable AI abstraction, assigns them to the best
suited agent via a deterministic scoring algorithm, enforces a controlled ticket
workflow, and monitors SLA deadlines with automatic escalation.

> **Status: Phase 5 complete (classification layer)** — on top of Phases 1–4:
> controlled workflow with audit trail, smart assignment, SLA monitoring with
> escalation, and now a replaceable ticket-classification seam (rule-based
> today, pluggable AI provider tomorrow) wired into ticket creation. Still
> ahead: comments, search, dashboards, docs, Docker.
> See [DEVELOPMENT_NOTES.md](DEVELOPMENT_NOTES.md) for engineering notes.

## Technology stack

| Layer     | Technology |
|-----------|------------|
| Language  | Java 21 |
| Framework | Spring Boot 3.3 (Web, Data JPA, Security, Validation) |
| ORM       | Hibernate 6.5 |
| Database  | PostgreSQL (primary), H2 (tests / zero-setup profile) |
| Auth      | JWT (jjwt) + BCrypt (added in Phase 2) |
| Docs      | springdoc-openapi (Swagger UI) |
| Build     | Maven |
| Tests     | JUnit 5, Mockito, Spring Boot Test |

## Project structure

```
com.intellidesk
├── common        # shared kernel (BaseEntity)
├── config        # app-wide beans (PasswordEncoder, DataSeeder)
├── user          # users, roles, (Phase 2: auth)
├── ticket        # tickets, comments, history, workflow
├── category      # support categories
├── agent         # agent skills and automated domain resolvers
├── sla           # SLA policies (Phase 6: scheduler)
├── dashboard     # (Phase 8) statistics
├── ecommerce     # catalog, customer orders, order items, real remediation actions
└── ai            # dual-mode AI/ML resolution agent & tool-calling engine
```

## Quick start

```bash
# Option A - zero-setup demo (in-memory H2, data lost on shutdown)
./mvnw spring-boot:run -Dspring-boot.run.profiles=h2

# Option B - PostgreSQL
export INTELLIDESK_DB_URL=jdbc:postgresql://localhost:5432/intellidesk
export INTELLIDESK_DB_USERNAME=intellidesk
export INTELLIDESK_DB_PASSWORD=intellidesk
./mvnw spring-boot:run

# Run tests
./mvnw test
```

### Environment variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `INTELLIDESK_DB_URL` | JDBC URL | `jdbc:postgresql://localhost:5432/intellidesk` |
| `INTELLIDESK_DB_USERNAME` | DB user | `intellidesk` |
| `INTELLIDESK_DB_PASSWORD` | DB password | `intellidesk` |
| `INTELLIDESK_JWT_SECRET` | **Required** HMAC secret, >= 32 chars (empty = fail fast) | *(none)* |
| `INTELLIDESK_JWT_EXPIRATION_MINUTES` | Token lifetime | `60` |
| `INTELLIDESK_ADMIN_EMAIL` | First admin account | `admin@intellidesk.local` |
| `INTELLIDESK_ADMIN_PASSWORD` | First admin password (**change it!**) | `Admin@12345` |

## Authentication & security (Phase 2)

### API

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/api/auth/register` | public | Create a CUSTOMER account, returns JWT |
| POST | `/api/auth/login` | public | Email/password -> JWT |
| GET | `/api/auth/me` | authenticated | Identity of the caller |
| GET | `/api/admin/ping` | ADMIN only | Authorization probe (chain rule + `@PreAuthorize`) |
| POST | `/api/tickets` | CUSTOMER | Create ticket (201 + `Location`) |
| GET | `/api/tickets/{id}` | owner / assigned agent / ADMIN | Ticket detail |
| GET | `/api/tickets/my` | CUSTOMER | Own tickets (paged) |
| GET | `/api/tickets/assigned` | AGENT | Assigned tickets (paged) |
| GET | `/api/tickets?status=&page=&size=&sort=` | ADMIN | All tickets (paged, optional status filter) |
| PATCH | `/api/tickets/{id}` | CUSTOMER (own+OPEN: title/description), ADMIN (all fields) | Partial update |
| POST | `/api/tickets/{id}/status` | role rules per edge (see workflow) | Controlled transition `{target, reason?, resolution?}` |
| GET | `/api/tickets/{id}/history` | owner / assigned agent / ADMIN | Append-only audit trail (newest last) |
| POST | `/api/tickets/{id}/assign` | ADMIN | Manual assignment (only from OPEN) |
| POST | `/api/tickets/{id}/auto-resolve` | owner / assigned agent / ADMIN | Run AI Resolution Agent with order remediation |
| GET | `/api/ecommerce/products` | public / authenticated | Active product catalog |
| GET | `/api/ecommerce/orders/my` | CUSTOMER | Customer's own order history |
| GET | `/api/ecommerce/orders` | AGENT / ADMIN | All customer orders |
| GET | `/api/ecommerce/orders/{id}` | owner / AGENT / ADMIN | Order details with items, carrier tracking & totals |
| GET | `/api/ecommerce/orders/by-number/{orderNumber}` | owner / AGENT / ADMIN | Lookup order by human order number (ORD-YYYY-XXXX) |
| GET | `/api/admin/agents` | ADMIN | Agent workloads (active ticket counts + skills) |
| POST | `/api/admin/agents/{agentId}/skills` | ADMIN | Upsert skill `{categoryId, proficiencyLevel 1..5}` |
| GET | `/api/admin/agents/{agentId}/skills` | ADMIN | Skills of one agent |
| DELETE | `/api/admin/agents/{agentId}/skills/{categoryId}` | ADMIN | Remove a skill |

### Ticket model (API view)

`id`, `ticketNumber` (`TKD-2026-000001`, derived from the PK — no volume
leakage, no race conditions), `title`, `description`, `status`, `priority`,
`category {id, code, name}`, `customer {id, fullName}`,
`assignedAgent {id, fullName} | absent`, `createdAt`, `updatedAt`,
`slaDeadlineAt`, `sla {status: ON_TRACK|AT_RISK|BREACHED, minutesToDeadline}`
(evaluated at read time), `resolution` (absent until resolved),
`resolvedAt`, `closedAt`, `escalatedAt` (kept after de-escalation as the
record of the last escalation), `sentiment` + `suggestedResponse`
(classification output; the suggested response is an internal agent hint —
customer-facing responses never contain it). Null fields are omitted
(`non_null` JSON inclusion).

Update rules: customers may edit title/description of their OWN ticket while
it is OPEN (409 afterwards); only ADMINs change category/priority — a priority
change recomputes the SLA deadline from the policy of the new priority
(verifiable: HIGH 8h -> CRITICAL 2h moves the deadline closer). Status
transitions arrive in Phase 4.

```bash
# Create a ticket (customer token)
curl -X POST http://localhost:8080/api/tickets -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Payment deducted but order failed","description":"Rs.500 was deducted from my account but the order was cancelled.","categoryId":1,"priority":"HIGH"}'

# Admin list with paging (unknown sort fields are rejected with 400)
curl "http://localhost:8080/api/tickets?page=0&size=5&sort=createdAt,desc" -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Example auth requests

```
client                    filter chain                       service
  |  POST /api/auth/login   |                                  |
  |------------------------>| permitAll -> AuthService         |
  |<-- 200 {token, user} ---| DaoAuthenticationProvider         |
  |                         |   (BCrypt compares)               |
  |  GET /api/x             |                                  |
  |  Authorization: Bearer  |                                  |
  |------------------------>| JwtAuthenticationFilter           |
  |                         |   verify signature+expiry         |
  |                         |   load user from DB (revocable)   |
  |                         |   set SecurityContext             |
  |                         | AuthorizationFilter               |
  |                         |   hasRole(...) per path           |
  |<-- 200 / 401 / 403 -----| 401=unknown/invalid  403=wrong role
```

Design decisions: stateless (no sessions, CSRF off because there are no
cookies), single error shape for 401/403 (JSON, no stack traces), account
enumeration prevented (wrong password and unknown email return the same 401
message), roles cannot be chosen at registration (fixed CUSTOMER; admins are
seeded/managed server-side), JWT secret externalized via
`INTELLIDESK_JWT_SECRET` with a startup failure if missing/too short.

### Example requests

```bash
# Register (201, returns token; duplicate email -> 409; bad input -> 400)
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"riya@example.com","password":"Passw0rd123","fullName":"Riya Sharma"}'

# Login (200; wrong credentials -> 401)
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"riya@example.com","password":"Passw0rd123"}'

# Authenticated call (401 without / garbage token)
curl http://localhost:8080/api/auth/me -H "Authorization: Bearer $TOKEN"

# Role check (customer -> 403, admin -> 200)
curl http://localhost:8080/api/admin/ping -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Database schema (Phase 1)

```
users ──1:N──> tickets (reporter_id, assigned_agent_id)
categories ──1:N──> tickets
sla_policies ──1:N──> tickets
tickets ──1:N──> ticket_comments ──N:1──> users (author)
tickets ──1:N──> ticket_history ──N:1──> users (changed_by)
users ──1:N──> agent_skills ──N:1──> categories
```

Key design decisions (all deliberate, all interview-friendly):

1. **Roles are an enum column, not a table.** IntelliDesk has exactly three
   system roles (`CUSTOMER`, `AGENT`, `ADMIN`) owned by the code. A roles table
   pays off only when roles are created at runtime; here it would add a join and
   an admin UI for no benefit.
2. **`users` table name** — `user` is a reserved word in PostgreSQL.
3. **SLA deadline is frozen on the ticket.** The ticket references the policy row
   for context but stores its own `sla_deadline_at`, computed once at creation.
   Editing a policy later never rewrites history (auditability).
4. **Optimistic locking (`version` column) on tickets** — two agents updating the
   same ticket concurrently get a clear conflict, not silent overwrites.
5. **Append-only `ticket_history`** — every state change is an immutable row;
   system events (SLA escalation) use a nullable actor plus a reason string.
6. **`ticket_number` business key + `id` surrogate key** — humans read
   `TKD-2026-000042`, foreign keys use the numeric id.
7. **`Instant` timestamps stored in UTC** (`hibernate.jdbc.time_zone=UTC`) —
   no server-timezone drift.
8. **LAZY associations + fetch graphs** — REST never serializes entities directly
   (DTOs in Phase 3), so no lazy-init surprises and no circular JSON.

## SLA targets (seeded into `sla_policies`)

| Priority | Resolution target |
|----------|-------------------|
| CRITICAL | 2 hours |
| HIGH     | 8 hours |
| MEDIUM   | 24 hours |
| LOW      | 48 hours |

## Ticket workflow (enforced)

```
OPEN ──> ASSIGNED ──> IN_PROGRESS ⇄ WAITING_FOR_CUSTOMER
  │           │            │               │
  │           │            └──> RESOLVED <─┘
  │           │                   │        │
  │           │        customer "not fixed" (-> IN_PROGRESS)
  │           │                   └──> CLOSED
  │           │                          │ customer reopen (7-day window)
  └───────────┴──────── ESCALATED <──────┘ (SLA monitor, system actor)
                          │
                          └──> IN_PROGRESS / ASSIGNED (senior pickup)
```

Every transition is validated in layers: (1) the domain edge must exist,
(2) the actor role is checked against the matrix below, (3) payload rules
apply (a resolution note is required when resolving), (4) side effects run
and **one audit row is written in the same transaction**. Illegal moves get
a 409 with the legal alternatives; forbidden actors get 403.

| Target | Who may do it |
|--------|---------------|
| IN_PROGRESS | assigned agent, ADMIN — or the reporter pulling a RESOLVED ticket back ("not fixed") |
| WAITING_FOR_CUSTOMER, RESOLVED | assigned agent, ADMIN |
| ASSIGNED (via status) | ADMIN only (manual assignment is `POST /{id}/assign`) |
| CLOSED | reporter (confirming the fix) or ADMIN |
| OPEN (reopen) | reporter (CLOSED→OPEN only inside `intellidesk.workflow.reopen-window-days`, default 7) or ADMIN; clears resolution data **and the stale agent** (back in the queue) |
| ESCALATED | SLA monitor (system actor) or ADMIN via API |

Side effects: resolve → `resolvedAt` + resolution note; close → `closedAt`;
reopen → clears `resolvedAt`/`closedAt`/`resolution`; escalate → `escalatedAt`.

## Classification (replaceable seam)

Ticket creation runs `request -> validation -> classification -> creation ->
SLA -> assignment -> history -> response`. The seam:

```java
public interface TicketClassificationService {
    TicketClassification classify(String title, String description);
}
// TicketClassification(categoryCode, priority, sentiment, suggestedResponse)
```

Business logic depends only on the interface. The active implementation is a
single configuration switch — `intellidesk.classification.provider`:

| Provider | Bean | Behaviour |
|----------|------|-----------|
| `rule-based` (default) | `RuleBasedTicketClassificationService` | deterministic keyword/phrase scoring, zero I/O, works fully offline |
| `ai` (future) | `AiTicketClassificationService` | external AI provider; isolated behind the same interface |

How the rule-based implementation decides (pure functions, same input ->
same output):

- **Category** — one point per DISTINCT keyword hit (word-boundary,
  case-insensitive) per category; highest score wins, ties break in the fixed
  order PAYMENT > SECURITY > ACCOUNT > TECHNICAL > ORDER > DELIVERY; no hits
  -> OTHER.
- **Priority** — phrase tiers: CRITICAL (outage, production down, data loss,
  all users, …) > HIGH (urgent, cannot access, losing money, …) > LOW (no
  hurry, cosmetic, …), default MEDIUM. An explicit request priority always
  wins over the classified one; an explicit `categoryId` likewise.
- **Sentiment** — NEGATIVE keywords beat POSITIVE ones, otherwise NEUTRAL.
- **Suggested response** — canned per-category template with a
  sentiment-aware prefix (an apology for angry customers). Stored on the
  ticket, shown to agents only.

Availability contract: classification is an enhancement, never a dependency.
`TicketService` wraps every call in a fallback — if the provider throws
(provider outage, timeout, malformed response), the ticket is still created
with OTHER/MEDIUM/NEUTRAL and a warning is logged. There are no API keys and
no network calls anywhere in the default setup, and tests never touch a
network.

## Smart assignment (deterministic, explainable)

When `intellidesk.assignment.auto-assign-on-create=true`, a new ticket is
assigned in the same transaction as its creation. The candidate pool is every
**active** agent with a skill row for the ticket's category; if none exists
the pool falls back to all active agents; with no active agents at all the
create fails with a clear 409.

Each candidate gets a score in `[0, 1+boost]`:

```
score = 0.50 · expertise + 0.30 · workloadScore + 0.20 · availability
        + priorityBoost

expertise     = proficiency/5   (0 if the agent has no skill row — only
                                possible in the fallback pool)
workloadScore = 1 − min(1, active / maxActivePerAgent)   (default max 10)
availability  = 1 if active < maxActivePerAgent else 0
priorityBoost = CRITICAL +0.20, HIGH +0.10 — but only if expertise ≥ 0.6
```

Weights are configuration (`intellidesk.assignment.weight-*`). The weights
sum to 1.0 so the base score stays in [0, 1]. Ties are broken by the **lower
agent id**, so selection is deterministic across runs and instances. Every
assignment writes an audit row containing the winning reason
(`Auto-assigned (best score for PAYMENT) - assigned to Meera N`), and
`GET /api/admin/agents` exposes the exact inputs (active counts, skills) that
produced the decision.

## SLA evaluation & escalation monitor

Deadline = creation time + the policy hours for the ticket's priority
(48/24/8/2), frozen on the row (recomputed only when an ADMIN changes the
priority). Read-time evaluation per ticket:

| Status | Meaning |
|--------|---------|
| `ON_TRACK` | now < deadline − at-risk window |
| `AT_RISK` | within `intellidesk.sla.at-risk-minutes` (default 60) before the deadline |
| `BREACHED` | at or after the deadline |

A Spring `@Scheduled` monitor (`intellidesk.sla.scan-interval-ms`, default
60s) pages through ESCALATABLE tickets (OPEN/ASSIGNED/IN_PROGRESS/
WAITING_FOR_CUSTOMER) with a deadline in the past and escalates them. The job
is **idempotent**: already-ESCALATED tickets are never re-selected, each row
is re-read inside its transaction, and the audit layer keeps a duplicate
guard — a ticket can never collect two escalation rows per breach.

## Configuration (new in Phase 4)

| Key | Default | Purpose |
|-----|---------|---------|
| `intellidesk.classification.provider` | `rule-based` | `rule-based` today; `ai` swaps in the future AI bean |
| `intellidesk.assignment.auto-assign-on-create` | `false` | assign best agent on create |
| `intellidesk.assignment.weight-expertise/workload/availability` | 0.50/0.30/0.20 | scoring weights |
| `intellidesk.assignment.max-active-tickets-per-agent` | 10 | capacity cap |
| `intellidesk.sla.scan-interval-ms` | 60000 | monitor period |
| `intellidesk.sla.at-risk-minutes` | 60 | AT_RISK window |
| `intellidesk.workflow.reopen-window-days` | 7 | how long a CLOSED ticket may be reopened |
| `intellidesk.ai.llm.enabled` | `false` | Enable external LLM (Gemini/OpenAI); when `false`, offline heuristic ML engine runs |
| `intellidesk.ai.llm.provider` | `gemini` | LLM provider: `gemini` or `openai` |
| `intellidesk.ai.llm.api-key` | *(empty)* | API key for Gemini or OpenAI (configured via env var `INTELLIDESK_LLM_API_KEY`) |
| `intellidesk.ai.llm.model` | `gemini-1.5-flash` | Model identifier |
| `intellidesk.ai.llm.auto-resolve-on-create` | `true` | Automatically run resolution agent on ticket creation for eligible issues |
| `intellidesk.ai.llm.confidence-threshold` | `0.75` | Minimum confidence required to auto-resolve |

## E-Commerce Integration & AI Resolution Agent

IntelliDesk integrates directly with an embedded E-Commerce domain (`Product`, `Order`, `OrderItem`), allowing support tickets to link directly to customer orders and execute automated remedial actions.

### 1. E-Commerce Domain Model
- **Entities**:
  - `Product`: catalog items with SKU, name, price, stock, active status.
  - `Order`: human-readable `orderNumber` (`ORD-YYYY-XXXX`), customer relationship, `OrderStatus` (`PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED`), `PaymentStatus` (`PENDING`, `PAID`, `FAILED`, `REFUNDED`), subtotal/shipping/tax/total amounts, and carrier tracking info (`trackingNumber`, `carrierName`, `estimatedDelivery`).
  - `OrderItem`: purchased products, quantity, unit price, total price.
- **Ticket Linkage**:
  - Tickets accept an optional `orderId` on creation (`POST /api/tickets`), or automatically link to an order by parsing order numbers (e.g., `ORD-2026-1001`) from the ticket title or description.
  - Ticket responses include an embedded `OrderSummary` DTO containing the order number, total amount, status, payment status, and tracking carrier.

### 2. Dual-Mode AI Agent Architecture
Remediation is handled by a specialized domain AI agent with tool-calling capabilities (`AiResolutionAgentService` & `AiToolRegistry`):

```
Customer Ticket (e.g., "Payment deducted but order failed ORD-2026-1002")
                       │
                       ▼
       ┌───────────────────────────────┐
       │   AiResolutionAgentService    │
       └───────────────┬───────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
  [LLM Enabled]                 [Offline / Default]
  Google Gemini / OpenAI        Deterministic Heuristic ML Engine
  Function Calling Protocol     Intent classifier + Entity extractor
        │                             │
        └──────────────┬──────────────┘
                       │
                       ▼
         ┌───────────────────────────┐
         │      AiToolRegistry       │
         │ - lookup_order            │
         │ - process_refund          │
         │ - cancel_order            │
         │ - sync_tracking           │
         │ - issue_store_credit      │
         └─────────────┬─────────────┘
                       │ Real DB & State Machine Mutation
                       ▼
         Order status updated (REFUNDED / CANCELLED)
         Ticket resolved with remediation audit note
```

- **Offline Heuristic ML Engine (Default)**: Runs 100% locally with zero external API key requirements and sub-millisecond execution. Classifies customer intent (Refund, Cancellation, Carrier Tracking, Voucher Credit), inspects order state invariants, executes domain tools, and outputs an explanation.
- **External LLM Provider (Gemini / OpenAI)**: Enabled via `intellidesk.ai.llm.enabled=true`. Sends tool definitions and the ticket prompt to the LLM endpoint; executes the chosen tool calls locally, and returns the LLM's natural language resolution summary.
- **Guardrails**:
  - Invariant checks: Cannot cancel orders that are already `SHIPPED` or `DELIVERED` (instructs customer on return flow).
  - Cannot refund orders that are already `REFUNDED`.
  - Auto-resolutions are recorded with full audit trails in `ticket_history`.

### 3. Copilot Console in Web UI
The modern Web UI (`index.html`) includes:
- **Order Selection Dropdown**: Customers can select their recent orders when creating a ticket.
- **E-Commerce Order Drawer**: Detail view shows linked order details (status, payment status, tracking number, items, and total amount).
- **Run AI Resolution Copilot**: An interactive button allowing support agents or admins to trigger autonomous resolution on-demand with live visual console output.

## License

MIT (portfolio project).
