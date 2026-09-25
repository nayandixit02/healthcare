# 🏥 EVE Healthcare — SDE Backend Engineering Assignment

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.21-blue.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://react.dev/)
[![Jest Tests](https://img.shields.io/badge/Jest-33%20Passed-brightgreen.svg)](https://jestjs.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://www.docker.com/)

A fullstack backend service & interactive dashboard for **Diagnostic Test Bookings**, **Simulated Payment Workflows**, and **Strictly Idempotent Payment Webhooks** built for the **EVE Healthcare** backend engineering assignment.

---

## 🌟 Key Architecture & Highlights

1. **Authentication & Role-Based Access Control (RBAC)**:
   - Secure user registration and login with bcrypt password hashing.
   - Signed JSON Web Tokens (JWT) for stateless Bearer authentication.
   - Granular RBAC (`patient`, `staff`, `admin`) to protect management endpoints.
2. **Diagnostic Centres & Test Offerings**:
   - Multi-tenant catalog mapping diagnostic tests to specific centres with custom pricing and turnaround times.
   - Filter by city, search by name, and paginated responses with Redis caching.
3. **Robust Booking State Machine**:
   - Future appointment validation, locked amount snapshot, and state transitions (`PENDING` ➔ `CONFIRMED` / `FAILED` / `CANCELLED`).
   - Strict ownership authorization (patients only view/cancel their own appointments; admins can view all).
4. **Simulated Payment Service**:
   - Mock endpoint at `POST /payments/` and `POST /api/v1/payments/`.
   - Simulates immediate `SUCCESS` or `FAILED` outcomes and synchronizes booking state atomically with audit records.
5. **Strictly Idempotent Payment Webhook (`POST /payments/webhook/`)**:
   - Deduplication tracking using unique `event_id` keys in database.
   - Prevents duplicate payments, duplicate bookings, replay attacks, and state corruption.
   - Handles concurrent webhooks safely.
6. **Bonus Engineering Features**:
   - ⚡ **Redis Caching**: Cached test and centre listings with automatic cache invalidation on writes.
   - 🛡️ **Rate Limiting**: `express-rate-limit` protecting API against abuse.
   - 📝 **Structured Logging**: Winston structured logger with colored terminal output and JSON support.
   - 📖 **Swagger / OpenAPI Documentation**: Interactive API console at `/docs`.
   - 🧪 **Comprehensive Automated Tests**: 33 Unit and Integration tests with Jest & Supertest across all modules.
   - 💻 **Interactive React Dashboard**: Modern glassmorphism UI for exploring centres, booking tests, simulating payments, and an interactive **Webhook Test Console**.

---

## 🏗️ Architecture & Database Schema Design

### Entity Relationship (ER) Model

```
 ┌──────────────────────┐              ┌──────────────────────────┐
 │        users         │              │    diagnostic_centres    │
 ├──────────────────────┤              ├──────────────────────────┤
 │ id (PK)              │              │ id (PK)                  │
 │ email (UNIQUE, INDEX)│              │ name                     │
 │ password             │              │ address                  │
 │ full_name            │              │ city (INDEX)             │
 │ phone_number         │              │ contact_phone            │
 │ role                 │              │ is_active                │
 └──────────┬───────────┘              └────────────┬─────────────┘
            │ 1                                     │ 1
            │                                       │
            │ N                                     │ N
 ┌──────────┴───────────┐              ┌────────────┴─────────────┐
 │       bookings       │◄─────────────┤   centre_test_offers     │
 ├──────────────────────┤ N          1 ├──────────────────────────┤
 │ id (PK)              │              │ id (PK)                  │
 │ user_id (FK)         │              │ centre_id (FK)           │
 │ centre_id (FK)       │              │ test_id (FK)             │
 │ test_id (FK)         │              │ price (NUMERIC)          │
 │ appointment_datetime │              │ turn_around_hours        │
 │ amount (LOCKED)      │              │ is_available             │
 │ status (INDEX)       │              │ UNIQUE(centre, test)     │
 └──────────┬───────────┘              └────────────┬─────────────┘
            │ 1                                     │ N
            │                                       │
            │ N                                     │ 1
 ┌──────────┴───────────┐              ┌────────────┴─────────────┐
 │       payments       │              │     diagnostic_tests     │
 ├──────────────────────┤              ├──────────────────────────┤
 │ id (PK)              │              │ id (PK)                  │
 │ booking_id (FK)      │              │ name                     │
 │ user_id (FK)         │              │ code (UNIQUE, INDEX)     │
 │ amount               │              │ category (INDEX)         │
 │ status (INDEX)       │              │ description              │
 │ transaction_ref (UQ) │              │ default_price            │
 └──────────────────────┘              └──────────────────────────┘

 ┌────────────────────────────────────────────────────────────────┐
 │                        webhook_events                          │
 ├────────────────────────────────────────────────────────────────┤
 │ id (PK)                                                        │
 │ event_id (UNIQUE INDEX) -- Idempotency Key                     │
 │ event_type (payment.success / payment.failed)                  │
 │ booking_id (INDEX)                                             │
 │ payment_id (FK nullable)                                       │
 │ payload (JSON TEXT)                                            │
 │ status (RECEIVED / PROCESSED / DUPLICATE_IGNORED / FAILED)     │
 │ response_summary                                               │
 │ retry_count (INTEGER)                                          │
 └────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart: Running Locally

### Option A: Using Docker & Docker Compose (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/nayandixit02/eve-healthcare.git
   cd eve-healthcare
   ```

2. Start the full stack with Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. Open your browser:
   - 🌐 **Web Dashboard**: `http://localhost:5000` (or `http://localhost:3000` in dev mode)
   - 📖 **Interactive Swagger Docs**: `http://localhost:5000/docs`
   - 🩺 **Health Check**: `http://localhost:5000/health`

---

### Option B: Running Locally Without Docker

#### Prerequisites:
- **Node.js**: v18+ (tested on v20 and v24)
- **PostgreSQL**: (optional; backend includes built-in in-memory fallback for instant zero-config testing)

1. **Install Backend Dependencies**:
   ```bash
   cd server
   npm install
   ```

2. **Install Frontend Dependencies & Build**:
   ```bash
   cd ../client
   npm install
   npm run build
   ```

3. **Seed the Database with Sample Data**:
   ```bash
   cd ../server
   npm run seed
   ```

4. **Start the Server**:
   ```bash
   npm start
   ```

5. **(Optional) Run Frontend Dev Server**:
   ```bash
   cd ../client
   npm run dev
   ```

---

## 🧪 Running Automated Tests

Run the full Jest test suite containing **33 unit and integration tests**:

```bash
cd server
npm test
```

### Test Coverage Highlights:
- ✅ **Authentication**: User signup, email format checks, password strength, duplicate prevention, valid/invalid login, JWT verification.
- ✅ **Centres & Tests**: Filtering by city, searching by name, custom pricing, admin-only protection (403 Forbidden for patients).
- ✅ **Bookings**: Past date validation, wrong centre/unoffered test rejection, price lock snapshots, authorization checks.
- ✅ **Payments**: Simulation of `SUCCESS` and `FAILED` outcomes, atomic status updates (`CONFIRMED`/`FAILED`), double-payment prevention.
- ✅ **Webhook Idempotency**: Strict duplicate `event_id` detection, duplicate payment prevention, preservation of cancelled/confirmed booking states, 404 on missing bookings.
- ✅ **Edge Cases**: Unauthenticated requests (401), invalid JWT tokens, structured 422 validation errors, rate limiting, and health checks.

---

## 📡 API Reference & Example Requests

### 1. User Signup
```bash
curl -X POST http://localhost:5000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alex@example.com",
    "password": "Password123!",
    "full_name": "Alex Mercer",
    "phone_number": "+1-555-0144",
    "role": "patient"
  }'
```

### 2. User Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "Patient@12345"
  }'
```
**Response:**
```json
{
  "status": "success",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "token_type": "bearer",
  "user": {
    "id": 2,
    "email": "patient@example.com",
    "full_name": "Alex Mercer",
    "role": "patient"
  }
}
```

---

### 3. List Diagnostic Centres
```bash
curl -X GET "http://localhost:5000/api/v1/centres?city=Bengaluru"
```

---

### 4. Create a Booking
```bash
curl -X POST http://localhost:5000/api/v1/bookings \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "centre_id": 1,
    "test_id": 1,
    "appointment_datetime": "2026-10-15T10:00:00.000Z",
    "notes": "Fasting 12 hours prior"
  }'
```
**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "user_id": 2,
    "centre_id": 1,
    "test_id": 1,
    "appointment_datetime": "2026-10-15T10:00:00.000Z",
    "amount": 350.00,
    "status": "PENDING",
    "notes": "Fasting 12 hours prior",
    "centre": { "id": 1, "name": "EVE Healthcare Metropolis Lab", "city": "Bengaluru" },
    "test": { "id": 1, "name": "Complete Blood Count (CBC)", "code": "CBC" }
  }
}
```

---

### 5. Simulate Payment (`POST /payments/`)
```bash
curl -X POST http://localhost:5000/payments/ \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 1,
    "simulate_status": "SUCCESS",
    "payment_method": "mock_card"
  }'
```
**Response:**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "booking_id": 1,
    "user_id": 2,
    "amount": 350.00,
    "status": "SUCCESS",
    "transaction_ref": "txn_8f39a7b21e40c492",
    "booking_status": "CONFIRMED"
  }
}
```

---

### 6. Idempotent Payment Webhook (`POST /payments/webhook/`)

#### First Delivery (New Event):
```bash
curl -X POST http://localhost:5000/payments/webhook/ \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "evt_gateway_tx_998811",
    "event_type": "payment.success",
    "booking_id": 1,
    "amount": 350.00
  }'
```
**Response:**
```json
{
  "status": "PROCESSED",
  "event_id": "evt_gateway_tx_998811",
  "message": "Booking successfully marked as CONFIRMED via webhook.",
  "booking_id": 1,
  "booking_status": "CONFIRMED",
  "is_duplicate": false
}
```

#### Duplicate Delivery (Same `event_id` Re-sent):
```bash
curl -X POST http://localhost:5000/payments/webhook/ \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "evt_gateway_tx_998811",
    "event_type": "payment.success",
    "booking_id": 1,
    "amount": 350.00
  }'
```
**Response (Idempotent 200 OK — No state modification or duplicate payment created):**
```json
{
  "status": "DUPLICATE_IGNORED",
  "event_id": "evt_gateway_tx_998811",
  "message": "Duplicate webhook event detected and safely ignored. No state modified.",
  "booking_id": 1,
  "booking_status": "CONFIRMED",
  "is_duplicate": true
}
```

---

## 🔑 Demo Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin / Doctor** | `admin@evehealthcare.com` | `Admin@12345` |
| **Patient** | `patient@example.com` | `Patient@12345` |

---

## 🧠 Key Design Decisions & Assumptions

1. **Centre-Specific Pricing**: Different diagnostic labs may have different overheads or equipment; the `centre_test_offers` table enables custom pricing and turnaround times per centre while keeping test catalog codes standardized.
2. **Locked Price at Booking Time**: The booking amount is permanently captured when created so subsequent catalog price updates never alter the price agreed upon during appointment creation.
3. **Idempotency Strategy**: Each external provider webhook carries a unique `event_id`. We use database-level uniqueness and lookup to guarantee exactly-once processing semantics without race conditions.
4. **State Machine Integrity**: A payment or webhook received for an already `CANCELLED` booking logs the payment without overriding the cancellation status.

---

## 🔮 What We Would Improve With More Time

1. **HMAC Webhook Signatures**: Implement cryptographic header signatures (`X-Hub-Signature-256` / `X-Webhook-Signature`) using SHA-256 HMAC for verifying provider authenticity.
2. **RabbitMQ / BullMQ Background Queues**: Asynchronous event dispatch for dispatching patient email/SMS appointment confirmations and invoice PDFs.
3. **Slot Capacity Management**: Real-time slot booking with concurrency limits per lab technician or phlebotomist per time window.
4. **Grafana & Prometheus Observability**: Exporting metrics for API p99 latencies, payment failure rates, and cache hit ratios.

---

## 👥 Authors
- **EVE Healthcare Engineering Team**
