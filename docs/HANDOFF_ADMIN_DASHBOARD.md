# Admin Dashboard — Handoff Brief

**Owner (parallel sprint):** TBD
**Blocks on:** nothing (reads existing tables; writes to a new audit_log table)
**Last updated:** 2026-10-17

---

## 1. What PulseCare is (30-second recap)

Smart Healthcare Appointment + Triage System. Patients book triage-matched visits with doctors; doctors sign immutable prescriptions; a 30K-row hospital directory from data.gov.in sits behind search.

Your job: **the platform-operator cockpit.** Admin logs in → manages users and doctors → verifies new doctors → curates hospitals → inspects audit log of clinical actions → sees platform KPIs. No clinical workflow — you observe and govern.

---

## 2. Stack & how to run

| Layer     | Tech                                                         |
| --------- | ------------------------------------------------------------ |
| Backend   | Spring Boot 3.3.4, Java 21, JPA/Hibernate, Flyway, PostgreSQL |
| Frontend  | React 19 + Vite + TypeScript (strict), react-router-dom v7, framer-motion, lucide-react, recharts (for KPI charts — add it) |
| Auth      | JWT access + refresh tokens, `@PreAuthorize` role gates      |
| DB        | PostgreSQL 16 (Docker), pg_trgm                              |
| Infra     | Docker Compose (`docker/docker-compose.yml`)                 |

### Run locally
```bash
# 1. Boot infra
cd docker && docker compose up -d

# 2. Hot-swap backend
cd apps/backend
export JAVA_HOME="/c/Program Files/Java/jdk-21" && export PATH="$JAVA_HOME/bin:$PATH"
mvn -q package -DskipTests
docker cp target/*.jar healthcare-backend:/app/app.jar
docker restart healthcare-backend

# 3. Frontend
cd apps/frontend && npm install && npm run dev
```

Backend: http://localhost:8080  •  Frontend: http://localhost:5173

---

## 3. Design system (match this exactly)

Warm-cream clinical palette.

```
Canvas       #f8f3eb
Card         #ffffff
Border       #eae3d8 / hover #d6cbbe
Ink primary  #1a110a
Ink body     #554e44
Ink muted    #706b63 / #8c857b
Accent brown #785b47
Pill bg      #faf7f1
Danger       #dc2626
Success      #16a34a
Warning      #d97706
```

Typography system stack. Hero 28/700. Section 20/700. Body 14. Radius 10/12/16/9999. Shadow at rest `0 2px 8px rgba(75,68,57,0.04)`.

Icons: **lucide-react only**. Chart colors should pick from palette (brown as primary series, soft rose/green/amber as accents) — do not use Recharts' defaults.

Patterns to copy:
- Searchable list with filters: [Hospitals.tsx](apps/frontend/src/components/Hospitals.tsx)
- Tabbed queue + detail drawer: [DoctorDashboard.tsx](apps/frontend/src/components/DoctorDashboard.tsx)
- Form sections: [PatientProfile.tsx](apps/frontend/src/components/PatientProfile.tsx)

---

## 4. Auth & role (already wired)

`Role` enum already contains `ADMIN`. Just:

1. Seed an admin user via an `AdminSeedRunner` (`@Profile("dev")`), same pattern as [ClinicSeedRunner.java](apps/backend/src/main/java/com/group6/healthcare/clinic/seed/ClinicSeedRunner.java). Suggested: `admin@pulsecare.local` / `admin#1234`.
2. Gate controllers with `@PreAuthorize("hasRole('ADMIN')")`.
3. In [App.tsx](apps/frontend/src/App.tsx), add `/admin/*` routes behind `<ProtectedRoute role="ADMIN">`.
4. Role-based redirect on login: admin lands on `/admin`.

---

## 5. What exists (what you read from)

| Thing                          | Table / file                                                              |
| ------------------------------ | ------------------------------------------------------------------------- |
| Users (all roles)              | `users` ([User.java](apps/backend/src/main/java/com/group6/healthcare/user/entity/User.java)) |
| Doctor profiles                | `doctors` + FK `hospital_id`                                              |
| Hospital directory (30K)       | `hospitals` (pg_trgm indexed on name + specialties)                       |
| Triage records                 | `triage_assessments`                                                      |
| Appointments + status history  | `appointments` (status machine incl. doctor OVERRIDE_URGENCY)             |
| Prescriptions                  | `prescriptions` + `prescription_items` (DR-03 immutable once SIGNED)      |
| Refresh tokens                 | `refresh_tokens`                                                          |

**You read all of these; you write only to:** your new `audit_log` table, `users.enabled`, `doctors.verified` (new column), hospital CRUD rows, and (optionally) a `settings` key-value table.

---

## 6. Data model you'll add

### V12__admin_audit_and_verification.sql (next available Flyway number)

```sql
-- Append-only audit log for high-value clinical/admin events
CREATE TABLE audit_log (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_user_id UUID REFERENCES users(id),
    actor_role    VARCHAR(32) NOT NULL,
    action        VARCHAR(64) NOT NULL,     -- e.g. PRESCRIPTION_SIGNED, APPOINTMENT_OVERRIDE_URGENCY, USER_DISABLED, DOCTOR_VERIFIED
    entity_type   VARCHAR(64) NOT NULL,     -- PRESCRIPTION | APPOINTMENT | USER | DOCTOR | HOSPITAL
    entity_id     UUID,
    before_snapshot JSONB,
    after_snapshot  JSONB,
    note          TEXT
);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_user_id);
CREATE INDEX idx_audit_log_action_time ON audit_log(action, occurred_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- Doctor verification state
ALTER TABLE doctors ADD COLUMN verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE doctors ADD COLUMN verified_at TIMESTAMPTZ;
ALTER TABLE doctors ADD COLUMN verified_by UUID REFERENCES users(id);
ALTER TABLE doctors ADD COLUMN registration_number VARCHAR(64);
ALTER TABLE doctors ADD COLUMN license_doc_url TEXT;

-- Key-value settings (feature flags, maintenance mode, triage weights)
CREATE TABLE platform_settings (
    key          VARCHAR(128) PRIMARY KEY,
    value        JSONB NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by   UUID REFERENCES users(id)
);
```

### Who writes to audit_log

Three sources (coordinate with me to add these one-liners; you own the admin-triggered ones):

1. **Clinical events** — I'll add publisher calls inside `PrescriptionService.sign/void`, `AppointmentService.doctorAction`. One line each.
2. **Admin events** — you emit from your own controllers: USER_DISABLED, DOCTOR_VERIFIED, HOSPITAL_UPDATED, SETTING_CHANGED.
3. **Auth events (optional)** — login/logout.

Build a small `AuditLogger` service with `log(action, entityType, entityId, before, after, note)` and inject it everywhere.

---

## 7. REST API you'll build

Mount under `/api/v1/admin/*`. All require `ADMIN` role.

### Users
| Method | Path                                       | Purpose                              |
| ------ | ------------------------------------------ | ------------------------------------ |
| GET    | `/users?role=&q=&enabled=&limit=50`        | Paginated, filterable                |
| GET    | `/users/{id}`                              | Detail incl. role-specific profile   |
| POST   | `/users/{id}/disable`                      | `enabled=false` + audit              |
| POST   | `/users/{id}/enable`                       | `enabled=true` + audit               |
| POST   | `/users/{id}/reset-password`               | Generate + email temp password (stub to log) |

### Doctors
| Method | Path                                       | Purpose                              |
| ------ | ------------------------------------------ | ------------------------------------ |
| GET    | `/doctors/pending-verification`            | `verified=false` list                |
| POST   | `/doctors/{id}/verify`                     | Sets verified + audit                |
| POST   | `/doctors/{id}/reject`                     | Body: `{reason}` — disables user + audit |
| PUT    | `/doctors/{id}`                            | Edit specialty, hospital, bio        |

### Hospitals (reuse existing [HospitalController](apps/backend/src/main/java/com/group6/healthcare/clinic/controller/HospitalController.java) read endpoints; add admin-only writes)
| Method | Path                                       | Purpose                              |
| ------ | ------------------------------------------ | ------------------------------------ |
| POST   | `/hospitals`                               | Create                               |
| PUT    | `/hospitals/{id}`                          | Edit                                 |
| DELETE | `/hospitals/{id}`                          | Soft-delete (add `deleted_at` column) — coordinate first |

### Audit log
| Method | Path                                       | Purpose                              |
| ------ | ------------------------------------------ | ------------------------------------ |
| GET    | `/audit?action=&entityType=&actorId=&from=&to=&limit=100` | Filter + paginate |
| GET    | `/audit/{id}`                              | Single entry with full snapshots     |

### Metrics (feed the KPI dashboard)
| Method | Path                                       | Purpose                              |
| ------ | ------------------------------------------ | ------------------------------------ |
| GET    | `/metrics/overview`                        | `{ totalPatients, totalDoctors, pendingVerification, appointmentsToday, prescriptionsToday, triageByUrgency: {RED:n, AMBER:n, GREEN:n} }` |
| GET    | `/metrics/appointments-by-day?days=30`     | `[{date, count, byStatus:{BOOKED:n, ...}}]` for a line chart |
| GET    | `/metrics/prescriptions-by-day?days=30`    | Same shape                           |
| GET    | `/metrics/top-doctors?limit=10`            | By appointment count last 30d        |

### Settings
| Method | Path                                       | Purpose                              |
| ------ | ------------------------------------------ | ------------------------------------ |
| GET    | `/settings`                                | All key/value                        |
| PUT    | `/settings/{key}`                          | Upsert + audit                       |

---

## 8. Frontend pages to build

Create under `apps/frontend/src/components/admin/`:

1. **AdminDashboard.tsx** (`/admin`) — KPI tiles row (patients, doctors, today's appointments, today's prescriptions, pending verifications), two line charts (appointments 30d, prescriptions 30d), triage urgency donut, top-doctors leaderboard.
2. **UsersAdmin.tsx** (`/admin/users`) — searchable table with role filter + enabled filter. Row actions: disable/enable/reset password/view detail drawer.
3. **DoctorVerification.tsx** (`/admin/doctors/verification`) — queue of unverified doctors with license-doc link, Approve / Reject buttons.
4. **HospitalsAdmin.tsx** (`/admin/hospitals`) — reuse your public Hospitals.tsx list, add Edit/Delete per row + "Add hospital" button that opens a form drawer.
5. **AuditLog.tsx** (`/admin/audit`) — filter bar (action, entity, actor, date range) + table + row click → side drawer showing before/after JSON diff. Use `react-diff-viewer` if you want a nice diff, else just render pretty JSON.
6. **PlatformSettings.tsx** (`/admin/settings`) — simple grid of key/value cards with JSON editor per key.

Add a left-nav sidebar for admin pages (admin app has more surface than patient/doctor so a sidebar makes sense). Keep the global [Header.tsx](apps/frontend/src/components/Header.tsx) at the top; put a vertical sidebar under it only when `pathname.startsWith('/admin')`.

Route additions in [App.tsx](apps/frontend/src/App.tsx):
```tsx
<Route path="/admin"             element={<ProtectedRoute role="ADMIN"><AdminDashboard/></ProtectedRoute>} />
<Route path="/admin/users"       element={<ProtectedRoute role="ADMIN"><UsersAdmin/></ProtectedRoute>} />
<Route path="/admin/doctors/verification" element={<ProtectedRoute role="ADMIN"><DoctorVerification/></ProtectedRoute>} />
<Route path="/admin/hospitals"   element={<ProtectedRoute role="ADMIN"><HospitalsAdmin/></ProtectedRoute>} />
<Route path="/admin/audit"       element={<ProtectedRoute role="ADMIN"><AuditLog/></ProtectedRoute>} />
<Route path="/admin/settings"    element={<ProtectedRoute role="ADMIN"><PlatformSettings/></ProtectedRoute>} />
```

---

## 9. API client additions

Add to [apps/frontend/src/services/api.ts](apps/frontend/src/services/api.ts):

```ts
export const adminApi = {
  users: {
    list:   (q?: string, role?: Role, enabled?: boolean) => fetchJson<User[]>(`/admin/users?...`),
    get:    (id: string) => fetchJson<UserDetail>(`/admin/users/${id}`),
    disable:(id: string) => fetchJson(`/admin/users/${id}/disable`, { method: 'POST' }),
    enable: (id: string) => fetchJson(`/admin/users/${id}/enable`,  { method: 'POST' }),
    reset:  (id: string) => fetchJson(`/admin/users/${id}/reset-password`, { method: 'POST' }),
  },
  doctors: {
    pending: () => fetchJson<Doctor[]>(`/admin/doctors/pending-verification`),
    verify:  (id: string) => fetchJson(`/admin/doctors/${id}/verify`, { method: 'POST' }),
    reject:  (id: string, reason: string) => fetchJson(`/admin/doctors/${id}/reject`, { method: 'POST', body: { reason } }),
  },
  hospitals: { create, update, remove, /* ... */ },
  audit: {
    list: (filters: AuditFilters) => fetchJson<AuditEntry[]>(`/admin/audit?...`),
    get:  (id: string) => fetchJson<AuditEntryDetail>(`/admin/audit/${id}`),
  },
  metrics: {
    overview:            () => fetchJson<Overview>(`/admin/metrics/overview`),
    appointmentsByDay:   (days = 30) => fetchJson<DayPoint[]>(`/admin/metrics/appointments-by-day?days=${days}`),
    prescriptionsByDay:  (days = 30) => fetchJson<DayPoint[]>(`/admin/metrics/prescriptions-by-day?days=${days}`),
    topDoctors:          (limit = 10) => fetchJson<DoctorKpi[]>(`/admin/metrics/top-doctors?limit=${limit}`),
  },
  settings: {
    list:   () => fetchJson<Setting[]>(`/admin/settings`),
    upsert: (key: string, value: unknown) => fetchJson(`/admin/settings/${key}`, { method: 'PUT', body: { value } }),
  },
};
```

---

## 10. Non-goals (do NOT touch)

- Clinical workflow — triage rules, appointment transitions, prescription signing. If you want to change behavior there, raise with the lead; admin only observes + audits.
- Patient dashboard, doctor dashboard, pharmacy dashboard (parallel team).
- Direct SQL mutations on `prescriptions` / `prescription_items` — these are immutable (DR-03) even for admin. If a clinical correction is needed, admin writes a note + the doctor voids & re-signs.
- SecurityConfig core logic — add path matchers only.
- Hospital CSV loader (idempotent batch import, 30K rows). Admin CRUD on individual rows is fine; bulk re-import isn't your scope.

---

## 11. Testing checklist (sprint done = all pass)

Backend:
- [ ] `AdminAccessControlTest`: PATIENT / DOCTOR / PHARMACIST calling `/admin/*` get 403; ADMIN gets 200.
- [ ] `AuditLogTest`: disabling a user writes `USER_DISABLED` with before/after snapshots.
- [ ] `DoctorVerificationTest`: unverified doctor doesn't appear in public [HospitalController](apps/backend/src/main/java/com/group6/healthcare/clinic/controller/HospitalController.java) results (add a filter — coordinate first).
- [ ] `MetricsTest`: appointments-by-day sums correctly across 30 days with mixed statuses.

Frontend end-to-end:
- [ ] Admin logs in → `/admin` renders KPIs with real numbers.
- [ ] Disable a patient → that patient's next login attempt returns 401 "account disabled".
- [ ] Verify a doctor → they move out of pending queue → they now appear in patient-facing doctor list (if filter added).
- [ ] Edit a hospital's specialties → `/hospitals/:id` on patient side reflects it.
- [ ] Doctor signs prescription (another session) → admin's audit log shows the row within one refresh.
- [ ] Mobile view (≤ 768px) — sidebar collapses to a drawer.

---

## 12. Repository conventions

- Branch: `feat/admin-dashboard`
- Commit style: `feat(admin): add user management` / `feat(admin): audit log viewer`
- Flyway: next available version. Do NOT renumber existing.
- New Maven deps: ping lead. (recharts for frontend KPIs is fine; or use inline SVG.)
- `mvn test` must stay green (currently 36 tests).

---

## 13. Open coordination items

Ping the lead (@Shivang) before starting these — they touch files the lead owns:

1. **Audit publisher hooks** in `PrescriptionService` + `AppointmentService` — I'll add once so both pharmacy + admin teams get the event stream.
2. **`doctors.verified` filter in public hospital-detail search** — needs a line in `HospitalService` / `DoctorService`.
3. **Login block when `enabled=false`** — one check in `AuthService.login`.
4. **Role-based redirect on login** → `/admin` for ADMIN.
