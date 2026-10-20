# Pharmacy Dashboard — Handoff Brief

**Owner (parallel sprint):** TBD
**Blocks on:** nothing (prescriptions pipeline is live)
**Last updated:** 2026-10-17

---

## 1. What PulseCare is (30-second recap)

Smart Healthcare Appointment + Triage System. Patient logs in → takes a triage questionnaire → books a slot with a matched doctor → doctor completes the visit → **doctor signs a prescription** → prescription becomes immutable + PDF-downloadable.

Your job: **take the signed prescription from here and build the fulfillment side.** Pharmacist logs in → sees queue of signed prescriptions → marks medicines as dispensed → patient picks up / gets delivery → payment settled.

---

## 2. Stack & how to run

| Layer     | Tech                                                         |
| --------- | ------------------------------------------------------------ |
| Backend   | Spring Boot 3.3.4, Java 21, JPA/Hibernate, Flyway, PostgreSQL |
| Frontend  | React 19 + Vite + TypeScript (strict), react-router-dom v7, framer-motion, lucide-react |
| Auth      | JWT access + refresh tokens, `@PreAuthorize` role gates      |
| DB        | PostgreSQL 16 (Docker), pg_trgm for fuzzy search             |
| Cache     | Redis (Docker)                                               |
| Infra     | Docker Compose (`docker/docker-compose.yml`)                 |

### Run locally
```bash
# 1. Boot infra (Postgres + Redis + backend container)
cd docker && docker compose up -d

# 2. Hot-swap workflow for backend changes (fast — ~15s)
cd apps/backend
export JAVA_HOME="/c/Program Files/Java/jdk-21" && export PATH="$JAVA_HOME/bin:$PATH"
mvn -q package -DskipTests
docker cp target/*.jar healthcare-backend:/app/app.jar
docker restart healthcare-backend

# 3. Frontend dev server
cd apps/frontend
npm install
npm run dev   # http://localhost:5173
```

Backend binds to **http://localhost:8080**. OpenAPI at `/swagger-ui.html` once running.

---

## 3. Design system (match this exactly)

Warm-cream clinical palette. All existing pages follow it — reuse the tokens, don't invent new ones.

```
Canvas       #f8f3eb
Card         #ffffff
Border       #eae3d8
Border hover #d6cbbe
Ink primary  #1a110a
Ink body     #554e44
Ink muted    #706b63 / #8c857b
Accent brown #785b47  (primary buttons, icons)
Pill bg      #faf7f1
Danger       #dc2626
Success      #16a34a   (approve)
Warning      #d97706   (pending)
```

Typography: system stack. Hero: 28px / 700 / `-0.02em`. Section: 20px / 700. Body: 14px.
Border radius: 10px (inputs), 12px (chips), 16px (cards), 9999px (pills + CTA buttons).
Shadow at rest: `0 2px 8px rgba(75,68,57,0.04)`. On hover: `0 8px 20px rgba(75,68,57,0.08)`.
Icons: **lucide-react only** (same size axis as rest of app — 14/16/18/22).

Reference files to copy patterns from:
- Table/list card: [Hospitals.tsx](apps/frontend/src/components/Hospitals.tsx)
- Queue + detail drawer: [DoctorDashboard.tsx](apps/frontend/src/components/DoctorDashboard.tsx)
- Form section layout: [PatientProfile.tsx](apps/frontend/src/components/PatientProfile.tsx)
- Prescription rendering (you'll show this to the pharmacist): [MyPrescriptions.tsx](apps/frontend/src/components/MyPrescriptions.tsx)

---

## 4. Auth & role (already wired)

`Role` enum already contains `PHARMACIST`. You do **not** need to touch SecurityConfig for the enum itself — just add path matchers.

- Login POST `/api/v1/auth/login` → returns `{ accessToken, refreshToken, user: { id, email, role, fullName } }`
- Front-end `authApi.login(email, password)` already handles role-based redirect. Add a `/pharmacy` route to the redirect switch in [App.tsx](apps/frontend/src/App.tsx) + protected route.
- Seed a pharmacist user via a new `PharmacySeedRunner` (`@Profile("dev")`), same pattern as [ClinicSeedRunner.java](apps/backend/src/main/java/com/group6/healthcare/clinic/seed/ClinicSeedRunner.java). Suggested creds: `pharmacist1@pulsecare.local` / `pharma#1234`.

Gate your controllers with:
```java
@PreAuthorize("hasRole('PHARMACIST')")
```

---

## 5. What exists upstream (don't re-build these)

| Thing you'll read                         | Where                                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Prescription (SIGNED) + items             | tables `prescriptions`, `prescription_items`                                                        |
| Prescription PDF generator                | [PrescriptionPdfService.java](apps/backend/src/main/java/com/group6/healthcare/clinic/service/PrescriptionPdfService.java) — reuse to show PDF in your UI |
| Patient info                              | table `users` (role=PATIENT)                                                                        |
| Doctor who signed                         | tables `doctors` + `users`                                                                          |
| Hospital directory (for pharmacy address) | table `hospitals` (30k rows seeded from CSV)                                                        |
| Prescription DTOs                         | [PrescriptionResponse.java](apps/backend/src/main/java/com/group6/healthcare/clinic/dto/PrescriptionResponse.java), `PrescriptionItemDto` |

**Only read from these.** Do not mutate prescriptions — DR-03 immutability rule: once a prescription is SIGNED it cannot change. Fulfillment state lives in your new `pharmacy_orders` table.

---

## 6. Data model you'll add

### V12__pharmacy.sql (new Flyway migration — pick next available number)

```sql
-- Medicines master list (seedable; pharmacy editable)
CREATE TABLE medicines (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(256) NOT NULL,
    generic_name    VARCHAR(256),
    form            VARCHAR(64),            -- TABLET, SYRUP, INJECTION, CREAM, ...
    strength        VARCHAR(64),            -- e.g. "500mg"
    unit_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
    stock_qty       INTEGER NOT NULL DEFAULT 0,
    reorder_level   INTEGER NOT NULL DEFAULT 10,
    hsn_code        VARCHAR(32),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_medicines_name_trgm ON medicines USING GIN (name gin_trgm_ops);

-- One order per signed prescription (idempotent: UNIQUE prescription_id)
CREATE TABLE pharmacy_orders (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id   UUID NOT NULL UNIQUE REFERENCES prescriptions(id),
    patient_id        UUID NOT NULL REFERENCES users(id),
    status            VARCHAR(24) NOT NULL,  -- NEW, PRICED, PAID, DISPENSED, READY_FOR_PICKUP, PICKED_UP, CANCELLED
    pharmacist_id     UUID REFERENCES users(id),
    fulfillment_mode  VARCHAR(16) NOT NULL DEFAULT 'PICKUP',  -- PICKUP | DELIVERY
    delivery_address  TEXT,
    subtotal          NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax               NUMERIC(10,2) NOT NULL DEFAULT 0,
    total             NUMERIC(10,2) NOT NULL DEFAULT 0,
    paid_at           TIMESTAMPTZ,
    dispensed_at      TIMESTAMPTZ,
    picked_up_at      TIMESTAMPTZ,
    cancelled_reason  TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_pharmacy_orders_status ON pharmacy_orders(status);
CREATE INDEX idx_pharmacy_orders_patient ON pharmacy_orders(patient_id);

-- One row per prescription_item resolved to a medicine. Snapshot pricing at dispense.
CREATE TABLE pharmacy_order_items (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id               UUID NOT NULL REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
    prescription_item_id   UUID NOT NULL REFERENCES prescription_items(id),
    medicine_id            UUID REFERENCES medicines(id),  -- null until pharmacist resolves it
    qty_dispensed          INTEGER NOT NULL DEFAULT 0,
    unit_price_snapshot    NUMERIC(10,2) NOT NULL DEFAULT 0,
    line_total             NUMERIC(10,2) NOT NULL DEFAULT 0,
    substitution_note      TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Status machine (enforce in service layer)
```
NEW → PRICED → PAID → DISPENSED → READY_FOR_PICKUP → PICKED_UP
  ↓     ↓       ↓
CANCELLED (allowed from any pre-DISPENSED state)
```

Mirror the pattern in [AppointmentService.doctorAction](apps/backend/src/main/java/com/group6/healthcare/clinic/service/AppointmentService.java) — one method per transition, each verifies current status before writing.

### Order creation (how your pipe fills)

The order should **auto-create** when a prescription is signed. Two options, pick one:

- **A. Event listener** (preferred): Spring `@EventListener` on a new `PrescriptionSignedEvent` published from `PrescriptionService.sign()`. One-line add in that service.
- **B. On-demand**: Pharmacist clicks "Pull new prescriptions" and backend finds `prescriptions WHERE status='SIGNED' AND NOT EXISTS (SELECT 1 FROM pharmacy_orders WHERE prescription_id = prescriptions.id)` and creates orders.

Both work. **A** is cleaner. Coordinate with me (owner of PrescriptionService) before adding the event publisher so we add it once.

---

## 7. REST API you'll build

Mount under `/api/v1/pharmacy/*`. All require `PHARMACIST` role unless noted.

| Method | Path                                     | Purpose                                   |
| ------ | ---------------------------------------- | ----------------------------------------- |
| GET    | `/orders?status=NEW,PRICED&limit=50`     | Queue list, filterable by status          |
| GET    | `/orders/{id}`                           | One order with items + linked prescription + patient |
| POST   | `/orders/{id}/price`                     | Body: `[{itemId, medicineId, qty, unitPrice}]` → sets PRICED |
| POST   | `/orders/{id}/mark-paid`                 | Flip to PAID (stub for payment)           |
| POST   | `/orders/{id}/dispense`                  | Flip to DISPENSED, decrement medicines.stock_qty |
| POST   | `/orders/{id}/ready`                     | Flip to READY_FOR_PICKUP                  |
| POST   | `/orders/{id}/pick-up`                   | Flip to PICKED_UP (terminal)              |
| POST   | `/orders/{id}/cancel`                    | Body: `{reason}` → CANCELLED              |
| GET    | `/medicines?q=para&limit=20`             | Autocomplete for pricing step             |
| POST   | `/medicines`                             | Create                                    |
| PUT    | `/medicines/{id}`                        | Update (price, stock, reorder level)      |
| GET    | `/medicines/low-stock`                   | `stock_qty <= reorder_level`              |

### Patient-side (role=PATIENT)
Add these to the existing prescription controller or a new `/api/v1/me/orders` controller:

| Method | Path                       | Purpose                                       |
| ------ | -------------------------- | --------------------------------------------- |
| GET    | `/api/v1/me/orders`        | Patient sees their orders (any status)        |
| GET    | `/api/v1/me/orders/{id}`   | One order with items                          |
| POST   | `/api/v1/me/orders/{id}/choose-fulfillment` | Body: `{mode: PICKUP\|DELIVERY, address?}` |

---

## 8. Frontend pages to build

Create under `apps/frontend/src/components/pharmacy/`:

1. **PharmacyDashboard.tsx** — queue (NEW + PRICED + PAID tabs) + KPIs (today's orders, revenue, low-stock count). Pattern: copy [DoctorDashboard.tsx](apps/frontend/src/components/DoctorDashboard.tsx) wholesale, replace guts.
2. **OrderDetail.tsx** — slide-over drawer with: patient info card, prescription items (each with a medicine autocomplete + qty + price input), subtotal/tax/total, status action buttons. Reuse chip styling from [PrescriptionEditor.tsx](apps/frontend/src/components/PrescriptionEditor.tsx).
3. **MedicinesInventory.tsx** — table with search + inline edit on price/stock. Highlight rows where `stock_qty <= reorder_level` in `#fef3c7` background.
4. **PatientOrders.tsx** (patient side) — tabs: Active / Picked up / Cancelled. Each card shows status pill + total + "Choose pickup/delivery" if `status=PAID`.

Add routes in [App.tsx](apps/frontend/src/App.tsx):
```tsx
<Route path="/pharmacy" element={<ProtectedRoute role="PHARMACIST"><PharmacyDashboard/></ProtectedRoute>} />
<Route path="/pharmacy/orders/:id" element={<ProtectedRoute role="PHARMACIST"><OrderDetail/></ProtectedRoute>} />
<Route path="/pharmacy/medicines" element={<ProtectedRoute role="PHARMACIST"><MedicinesInventory/></ProtectedRoute>} />
<Route path="/orders" element={<ProtectedRoute role="PATIENT"><PatientOrders/></ProtectedRoute>} />
```

Add a "Pharmacy" nav link in [Header.tsx](apps/frontend/src/components/Header.tsx) when `user.role === 'PHARMACIST'`.
Add a "My medicine orders" tile on [PatientDashboard.tsx](apps/frontend/src/components/PatientDashboard.tsx) linking to `/orders`.

---

## 9. API client additions

Add to [apps/frontend/src/services/api.ts](apps/frontend/src/services/api.ts) alongside existing `prescriptionsApi`:

```ts
export const pharmacyApi = {
  listOrders: (status?: string) => fetchJson<Order[]>(`/pharmacy/orders${status ? '?status=' + status : ''}`),
  getOrder:   (id: string) => fetchJson<OrderDetail>(`/pharmacy/orders/${id}`),
  price:      (id: string, body: PriceBody) => fetchJson(`/pharmacy/orders/${id}/price`, { method: 'POST', body }),
  markPaid:   (id: string) => fetchJson(`/pharmacy/orders/${id}/mark-paid`, { method: 'POST' }),
  dispense:   (id: string) => fetchJson(`/pharmacy/orders/${id}/dispense`, { method: 'POST' }),
  ready:      (id: string) => fetchJson(`/pharmacy/orders/${id}/ready`, { method: 'POST' }),
  pickUp:     (id: string) => fetchJson(`/pharmacy/orders/${id}/pick-up`, { method: 'POST' }),
  cancel:     (id: string, reason: string) => fetchJson(`/pharmacy/orders/${id}/cancel`, { method: 'POST', body: { reason } }),
  searchMedicines: (q: string) => fetchJson<Medicine[]>(`/pharmacy/medicines?q=${encodeURIComponent(q)}`),
  // ...
};
export const patientOrdersApi = {
  list: () => fetchJson<Order[]>(`/me/orders`),
  get:  (id: string) => fetchJson<OrderDetail>(`/me/orders/${id}`),
  chooseFulfillment: (id: string, body: FulfillmentBody) => fetchJson(`/me/orders/${id}/choose-fulfillment`, { method: 'POST', body }),
};
```

Add types to [types/index.ts](apps/frontend/src/types/index.ts) matching DTO shapes.

---

## 10. Non-goals (do NOT touch)

- Prescription signing / voiding logic in [PrescriptionService.java](apps/backend/src/main/java/com/group6/healthcare/clinic/service/PrescriptionService.java) — immutable by design (DR-03).
- Appointment lifecycle in [AppointmentService.java](apps/backend/src/main/java/com/group6/healthcare/clinic/service/AppointmentService.java).
- Hospital CSV loader / search.
- Existing patient dashboard layout — add a tile, don't rearrange.
- SecurityConfig public paths (your routes are all authenticated).
- Payment gateway integration — stub `mark-paid` as a one-click toggle for now. Real Razorpay/Stripe is out of scope.

---

## 11. Testing checklist (sprint done = all pass)

Backend:
- [ ] `PharmacyOrderLifecycleTest`: NEW → PRICED → PAID → DISPENSED → READY → PICKED_UP end-to-end
- [ ] Can't skip states (POST `/dispense` on NEW returns 409)
- [ ] Can't price an order twice (idempotency or 409)
- [ ] Cancel after DISPENSED is rejected
- [ ] Stock decrements on dispense; can't dispense if any item's qty > stock
- [ ] Role gate: PATIENT calling `/pharmacy/*` gets 403

Frontend end-to-end:
- [ ] Doctor signs a prescription → pharmacist refreshes dashboard → new order appears in NEW
- [ ] Pharmacist prices + marks paid + dispenses → patient's `/orders` shows status flip in realtime (poll every 15s is fine, no WebSockets)
- [ ] Low-stock badge shows on inventory page
- [ ] Mobile view (≤ 768px) is usable — queue cards stack

---

## 12. Repository conventions

- Branch: `feat/pharmacy-dashboard`
- Commit style: existing — `feat(pharmacy): add order queue` / `fix(pharmacy): guard dispense when stock empty`
- Flyway: pick the next available version number (currently V11 is last). Do NOT renumber existing migrations.
- No new Maven deps without pinging the lead — OpenPDF + Commons CSV already present.
- Run `mvn test` before pushing. 36 existing tests must stay green.

---

## 13. Questions? Ping

- Prescription schema or signing event hook: @Shivang (owner)
- Design tokens / Header integration: @Shivang
- Role & SecurityConfig: @Shivang
