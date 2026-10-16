# PulseCare — Smart Healthcare Appointment & Triage System
## Project Overview & Architectural Summary (Step 0 & Step 1 Completed)

---

### 1. Executive Summary
**PulseCare** is an end-to-end smart healthcare platform designed to streamline clinical appointment scheduling and intelligent patient triage. It bridges patients with medical specialists through automated severity assessments (Emergency, Urgent, Routine), live teleconsultation rooms, e-prescriptions, and role-based clinical dashboards.

---

### 2. Architecture & Monorepo Structure

```
SE_Project_Step0_1/
├── apps/
│   ├── backend/                     # Spring Boot 3.3.4 (Java 21) REST API
│   │   ├── pom.xml                  # Maven config (Java 21 compiler release)
│   │   └── src/
│   │       ├── main/
│   │       │   ├── java/com/group6/healthcare/
│   │       │   │   ├── auth/        # Authentication, JWT, Refresh Tokens, Controllers
│   │       │   │   ├── user/        # User entity (PATIENT, DOCTOR), Repositories
│   │       │   │   ├── config/      # Spring Security, CORS, JWT Properties, OpenAPI
│   │       │   │   └── common/      # Standard ApiResponse<T>, Global Exception Handling
│   │       │   └── resources/
│   │       │       ├── application.yml
│   │       │       ├── application-dev.yml # Docker & local Postgres dynamic DB URL
│   │       │       └── db/migration/       # Flyway SQL migrations (V1, V2)
│   │       └── test/                # 13 Integration and Unit Tests (All Passing)
│   │
│   └── frontend/                    # Vite + React 19 + TypeScript SPA
│       ├── package.json             # React 19, Lucide icons, GSAP, React Router v7
│       ├── vite.config.ts           # Dev server (port 5173) + /api proxy to :8080
│       ├── public/                  # 10 production assets (categories + 3D icons)
│       └── src/
│           ├── components/
│           │   ├── Header.tsx               # Role-aware navigation (Clean Warm Theme)
│           │   ├── LandingPage.tsx          # Screen 1 (Warm Cream #f8f3eb)
│           │   ├── PatientDashboard.tsx     # Screen 2 (User-Isolated Data)
│           │   ├── DoctorDashboard.tsx      # Screen 3 (Warm Mocha/Cream Theme)
│           │   ├── AuthPage.tsx             # Dedicated /login & /signup portal
│           │   ├── PatientTriageBooking.tsx # Multi-step booking & triage modal
│           │   └── ExplainTriage.tsx        # Explainable AI triage breakdown
│           ├── services/
│           │   ├── api.ts                   # Real Backend API client (Auth & Storage)
│           │   └── triageMock.ts            # Clinical doctors & triage rules engine
│           ├── types/                       # Shared TypeScript interfaces
│           ├── App.tsx                      # Root App with URL Router & Session Watcher
│           └── main.tsx                     # Entrypoint with BrowserRouter
│
└── docker/
    └── docker-compose.yml           # Postgres 16 (port 5432) & Redis 7 (port 6379)
```

---

### 3. Detailed Work Completed

#### A. Frontend UI & Wireframe Alignment (Screens 1, 2, 3)
1. **Design System**:
   - Uniform warm cream aesthetic (`#f8f3eb` background, `#1a110a` typography, `#785b47` warm earth accents, `#eae3d8` borders).
   - Removed artificial wireframe switcher tabs in favor of genuine role-based routing.
   - Removed dark mode toggle from Header to preserve the consistent medical aesthetic.
2. **Screen 1: Landing Page (`LandingPage.tsx`)**:
   - Integrated 4 real high-resolution category cards (`video-consult.jpg`, `find-doctors.jpg`, `my-records.jpg`, `order-medicine.jpg`).
   - Integrated 6 custom 3D glossy clay symptom icons (`fever`, `headache`, `chest pain`, `child unwell`, `pregnancy`, `mental health`).
   - Full specialty names (e.g. *Cardiology*, *Dermatology*, *General Medicine*).
3. **Screen 2: Patient Dashboard (`PatientDashboard.tsx`)**:
   - **Personalized Data Isolation**: When a regular patient signs in, they see **their own data only** (actual booked appointments, user-specific To-Dos, and clean states for prescriptions/orders).
   - **1–2 Test/Demo Users**: Rich demo data is strictly reserved for designated test accounts (`Sarah Jenkins` / `patient.test@pulsecare.com` and `Avi Patel`).
4. **Screen 3: Doctor Dashboard (`DoctorDashboard.tsx`)**:
   - Aligned background and cards to match the warm mocha/cream theme.
   - Live clinical triage queue sorted by AI severity score (`EMERGENCY` red, `URGENT` amber, `ROUTINE` green).
   - Interactive clinical actions: Accept Case, Escalate Urgency, Request Vitals, and Complete Consultation.

---

#### B. Dedicated Authentication Routing (`/login` & `/signup`)
1. **Full-Page Dedicated Routes**:
   - Replaced modal popup with dedicated URL routes (`/login` and `/signup`).
   - Dynamic tab switching updates browser history without full page reloads.
   - Removed distraction sidebars and top database connection badge for a clean, centered single card layout (`maxWidth: 480px`).
   - Included 1-click quick demo buttons for testing patient and doctor logins effortlessly.
2. **Email Normalization**:
   - Input sanitization (`email.trim().toLowerCase()`) ensures seamless sign in and registration regardless of casing or accidental spaces.
3. **Session Persistence**:
   - Stores JWT tokens and user data in `localStorage`.
   - On page reload, `authApi.getMe()` verifies session freshness with the backend and keeps the user signed in.

---

#### C. Backend (Spring Boot 3.3.4 & Java 21)
1. **Canonical Backend**:
   - Confirmed `apps/backend/` as the single canonical backend used by Docker and Maven.
   - Updated `pom.xml` to `<release>21</release>` for modern Java 21 compiler support.
   - Fixed `application-dev.yml` to support `${DB_URL:...}` for dynamic Docker Compose container resolution.
2. **End-to-End Authentication**:
   - `POST /api/auth/register`: Validates DTO, hashes passwords with BCrypt, stores user in PostgreSQL, and issues JWT access token + refresh token.
   - `POST /api/auth/login`: Authenticates credentials against PostgreSQL and returns JWT tokens.
   - `GET /api/auth/me`: Protected endpoint returning user details via `Bearer` token.
   - `POST /api/auth/logout`: Revokes refresh tokens.
3. **Automated Testing**:
   - Ran `mvn test` in `apps/backend`: **All 13 integration and unit tests passed** (0 failures, 0 errors).

---

#### D. Database & Infrastructure
1. **PostgreSQL 16**:
   - Running in Docker container `healthcare-postgres` on port `5432`.
   - Flyway migrations automatically applied:
     - `V1__baseline.sql`: Initial schema setup.
     - `V2__users_and_refresh_tokens.sql`: `users` table and `refresh_tokens` table.
2. **Redis 7**:
   - Running in Docker container `healthcare-redis` on port `6379`.

---

### 4. Git Repository & Remote Status
- **Remote Repository**: `https://github.com/Yug-Gabani/SE_2`
- **Active Branch**: `main`
- **Commit Policy**: Per user instructions, **no Git commits are made unless explicitly directed**.

---

### 5. Next Planned Work (Step 2 Implementation)
1. **Backend Triage Engine**:
   - Build `TriageController` (`POST /api/v1/triage/assess`) and `TriageService`.
   - Implement backend rule-based and AI advisory score calculation.
2. **Backend Appointment Booking**:
   - Implement `Appointment` entity, repository, and booking endpoints.
   - Connect frontend `PatientTriageBooking.tsx` to persist appointments directly to PostgreSQL.
