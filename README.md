# RideForge — Full Stack Ride Booking Platform

A production-grade ride booking web application built as a monorepo. RideX is a full-stack real-time system with three separate frontend applications and one backend server, all sharing a common TypeScript types package. The system supports real-time ride matching, live driver tracking, dynamic pricing, and a complete ride lifecycle from booking to payment.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Applications](#applications)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Core Algorithms](#core-algorithms)
- [Ride Lifecycle](#ride-lifecycle)
- [Architecture Decisions](#architecture-decisions)

---

## Project Structure

```
ridex/
├── package.json                  ← Root workspace config
├── apps/
│   ├── backend/                  ← Node.js + Express + TypeScript
│   │   ├── src/
│   │   │   ├── config/           ← Logger, error classes
│   │   │   ├── db/               ← Pool, query helpers, migrations, seed
│   │   │   ├── middleware/       ← Auth, validation, error handling
│   │   │   ├── modules/
│   │   │   │   ├── auth/         ← Register, login, refresh, logout
│   │   │   │   ├── rides/        ← Ride CRUD, Haversine, matching
│   │   │   │   ├── drivers/      ← Profile, vehicle, availability, earnings
│   │   │   │   ├── pricing/      ← Fare calculation, surge logic
│   │   │   │   ├── payments/     ← Payment records, invoice generation
│   │   │   │   ├── ratings/      ← Submit and retrieve ratings
│   │   │   │   └── admin/        ← Stats, user management, analytics
│   │   │   ├── socket/           ← Socket.io handlers, ride tracker
│   │   │   └── index.ts          ← Server entry point
│   │   └── .env
│   ├── rider-app/                ← React app for riders (port 5173)
│   ├── driver-app/               ← React app for drivers (port 5174)
│   └── admin-dashboard/          ← React admin panel (port 5175)
└── packages/
    └── shared/                   ← Shared TypeScript types and socket event maps
        └── src/
            └── index.ts
```

---

## Tech Stack

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL (raw `pg` driver, no ORM)
- **Real-time:** Socket.io
- **Auth:** JSON Web Tokens — access tokens (15 min) + refresh tokens (7 days)
- **Security:** bcryptjs, helmet, express-rate-limit, CORS
- **Validation:** express-validator
- **Logging:** Winston

### Frontend (all three apps)
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **State:** Zustand (client state) + TanStack Query v5 (server state)
- **Routing:** React Router v6
- **Real-time:** Socket.io-client
- **Maps:** Leaflet + CartoDB dark tiles (OpenStreetMap, no API key required)
- **Routing:** OSRM public server (free, no API key)
- **Geocoding:** Nominatim (OpenStreetMap, free, no API key)
- **Animations:** Framer Motion (spring physics)

### Infrastructure
- **Monorepo:** npm workspaces
- **Shared types:** `@ridex/shared` package consumed by all four apps

---

## Applications

### Rider App — `localhost:5173`

The main customer-facing application. Riders can search for locations, see fare estimates across vehicle types, book rides, track their driver in real time, and rate their experience.

Screens:
- Login and Register
- Home with full-screen map and location search
- Ride booking with pickup and drop selection
- Fare estimate with animated breakdown
- Searching driver with radar animation
- Active ride with live driver tracking and ETA ring
- Ride complete with invoice and rating prompt
- Rating page with stars and quick tags
- Ride history with expandable receipts
- Profile page with stats

### Driver App — `localhost:5174`

The driver-facing application. Drivers register their vehicle, toggle availability, receive incoming ride offers with a 15-second countdown, manage the ride lifecycle, and view their earnings.

Screens:
- Login and Register
- Dashboard with availability toggle and earnings summary
- Incoming ride offer card with accept and reject
- Active ride with status controls (Arrived → Started → Completed)
- Ride history
- Earnings dashboard with daily breakdown chart
- Vehicle management

### Admin Dashboard — `localhost:5175`

The internal operations panel. Admins can monitor the platform in real time, approve or reject driver registrations, manage users, and view revenue analytics.

Screens:
- Dashboard with platform-wide KPIs
- Driver approval queue
- User management with search and role filter
- All rides with status filters
- Revenue analytics with period selector (week/month/year)
- Payment records

---

## Getting Started

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm 8 or higher

### Install dependencies

```bash
# Clone the repo
git clone https://github.com/your-username/ridex.git
cd ridex

# Install all workspace dependencies from root
npm install
```

### Build shared types

```bash
npm run build:shared
```

### Run database migrations

```bash
cd apps/backend
npx ts-node src/db/migrate.ts
```

### Seed test data

```bash
npx ts-node src/db/seed.ts
```

This creates three accounts:

| Role | Phone | Password |
|---|---|---|
| Rider | 9876543210 | password123 |
| Driver | 9123456789 | password123 |
| Admin | 9999999999 | admin123 |

### Start all apps simultaneously

```bash
# From root
npm run dev
```

Or start individually:

```bash
npm run dev:backend    # Express server on port 4000
npm run dev:rider      # Rider app on port 5173
npm run dev:driver     # Driver app on port 5174
npm run dev:admin      # Admin dashboard on port 5175
```

---

## Environment Variables

Create `apps/backend/.env`:

```env
PORT=4000
NODE_ENV=development

# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ridex

# JWT — use long random strings in production
JWT_SECRET=your_jwt_secret_minimum_32_characters
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend URLs (for CORS)
RIDER_APP_URL=http://localhost:5173
DRIVER_APP_URL=http://localhost:5174
ADMIN_URL=http://localhost:5175
```

Create `apps/rider-app/.env`:

```env
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

Same pattern for `apps/driver-app/.env` and `apps/admin-dashboard/.env`.

No map API keys are required. The map stack (Leaflet, OSRM, Nominatim) is entirely free and open source.

---

## Database Setup

The schema uses raw SQL managed through a custom migration file. Nine tables with proper relational constraints, enums, indexes, and triggers.

### Tables

```
users           → base auth table, role enum: RIDER / DRIVER / ADMIN
riders          → rider profile (rating, total rides)
drivers         → driver profile (approval, availability, live coords, earnings)
vehicles        → one vehicle per driver (make, model, plate, type, color)
rides           → core transaction table with full status lifecycle
payments        → one payment record per completed ride
ratings         → one rating row per ride storing both rider and driver ratings
refresh_tokens  → JWT refresh token store for rotation
```

### Ride status enum

```
REQUESTED → ACCEPTED → ARRIVED → IN_PROGRESS → COMPLETED
                                              → CANCELLED (from any state)
```

### Run migrations manually

```bash
cd apps/backend
npx ts-node src/db/migrate.ts
```

### Key indexes

```sql
idx_rides_rider_id       on rides(rider_id)
idx_rides_driver_id      on rides(driver_id)
idx_rides_status         on rides(status)
idx_drivers_available    on drivers(is_available, is_approved)
idx_rides_requested      on rides(requested_at DESC)
idx_refresh_tokens       on refresh_tokens(token)
```

---

## API Reference

All endpoints return:

```json
{ "success": true, "data": {} }
{ "success": false, "error": { "message": "...", "code": "..." } }
```

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | Public | Register as rider or driver |
| POST | `/login` | Public | Login, returns access + refresh tokens |
| POST | `/refresh` | Public | Rotate refresh token |
| POST | `/logout` | Public | Invalidate refresh token |
| GET | `/me` | Any | Current user profile with role-specific data |

### Rides — `/api/rides`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/estimate-fare` | Any | Fare estimate before booking |
| GET | `/active` | RIDER | Current active ride |
| GET | `/history` | Any | Paginated ride history |
| GET | `/:rideId` | RIDER/DRIVER | Single ride with full detail |
| POST | `/:rideId/cancel` | Any | Cancel a ride |
| POST | `/:rideId/rate` | Any | Submit rating |

### Drivers — `/api/drivers`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/me` | DRIVER | Driver profile with vehicle |
| POST | `/vehicle` | DRIVER | Register vehicle |
| PATCH | `/vehicle` | DRIVER | Update vehicle details |
| PATCH | `/availability` | DRIVER | Go online or offline |
| PATCH | `/location` | DRIVER | Update GPS coordinates |
| GET | `/active-ride` | DRIVER | Current active ride |
| GET | `/history` | DRIVER | Paginated ride history |
| GET | `/earnings` | DRIVER | Earnings with daily breakdown |

Query: `?period=today|week|month`

### Payments — `/api/payments`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/history` | Any | Payment history |
| GET | `/ride/:rideId` | Any | Payment for a specific ride |
| GET | `/ride/:rideId/invoice` | Any | Full structured invoice |
| PATCH | `/ride/:rideId/method` | RIDER | Change payment method |
| GET | `/` | ADMIN | All payments with optional status filter |

### Ratings — `/api/ratings`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | Any | Submit rating `{ rideId, rating, comment }` |
| GET | `/ride/:rideId` | Any | Rating for a specific ride |
| GET | `/my-ratings` | DRIVER | All ratings received by driver |

### Admin — `/api/admin`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/stats` | ADMIN | Full dashboard KPIs in one query |
| GET | `/users` | ADMIN | All users, filterable by role and search |
| GET | `/drivers` | ADMIN | All drivers, filterable by approval status |
| PATCH | `/drivers/:driverId/approve` | ADMIN | Approve or reject a driver |
| GET | `/rides` | ADMIN | All rides, filterable by status |
| GET | `/analytics/revenue` | ADMIN | Revenue chart data by period |
| PATCH | `/users/:userId/block` | ADMIN | Block or unblock a user |
| GET | `/payments` | ADMIN | All payments |

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | Public | Server status and timestamp |

### Supported query parameters

```
page=1&limit=10          pagination (most list endpoints)
period=today|week|month  earnings and analytics
status=COMPLETED         filter by ride or payment status
role=RIDER|DRIVER        filter users by role
search=rahul             search users by name, phone, or email
approved=true|false      filter drivers by approval status
```

---

## WebSocket Events

Connection requires a valid JWT access token passed in the handshake auth object:

```javascript
const socket = io('http://localhost:4000', {
  auth: { token: accessToken }
});
```

### Client → Server

| Event | Sent by | Payload |
|---|---|---|
| `ride:request` | RIDER | `{ pickupLat, pickupLng, pickupAddress, dropLat, dropLng, dropAddress, distanceKm, durationMin }` |
| `ride:accept` | DRIVER | `{ rideId }` |
| `ride:reject` | DRIVER | `{ rideId }` |
| `ride:status` | DRIVER | `{ rideId, status }` |
| `ride:cancel` | RIDER | `{ rideId }` |
| `driver:location` | DRIVER | `{ lat, lng, rideId? }` |

### Server → Client

| Event | Received by | Payload |
|---|---|---|
| `ride:created` | RIDER | Full ride object |
| `ride:incoming` | DRIVER | Ride object with rider info |
| `ride:no_driver` | RIDER | — |
| `ride:accepted` | RIDER + DRIVER | `{ ride, driver }` |
| `ride:already_taken` | DRIVER | — |
| `ride:status_update` | RIDER + DRIVER | `{ rideId, status }` |
| `ride:cancelled` | RIDER + DRIVER | `{ rideId }` |
| `driver:moved` | RIDER | `{ lat, lng }` |
| `error` | Any | `{ message }` |

---

## Core Algorithms

### Haversine Distance Formula

Implemented from scratch in `apps/backend/src/modules/rides/haversine.ts`. Calculates the great-circle distance between two GPS coordinates accounting for the earth's curvature.

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
c = 2 × atan2(√a, √(1−a))
d = R × c     where R = 6371 km
```

Used to find all available drivers within a 5km radius of the pickup point and sort them by distance ascending to identify the nearest candidate.

### Surge Pricing

Compares ride requests in the last 5 minutes against currently available drivers:

```
ratio = active_requests / available_drivers

ratio >= 4.0  →  2.0x multiplier
ratio >= 3.0  →  1.8x multiplier
ratio >= 2.0  →  1.5x multiplier
ratio >= 1.5  →  1.2x multiplier
ratio < 1.5   →  1.0x (no surge)
```

### Fare Calculation

Three vehicle tiers with independent rates (INR):

| Component | Sedan | SUV | Auto |
|---|---|---|---|
| Base fare | ₹30 | ₹50 | ₹20 |
| Per km | ₹12 | ₹18 | ₹8 |
| Per minute | ₹1.5 | ₹2.0 | ₹1.0 |
| Minimum fare | ₹50 | ₹80 | ₹30 |

Final fare = `(base + distance × perKm + duration × perMin) × surgeMultiplier`

### Race Condition Prevention on Ride Acceptance

When multiple drivers are online, two could attempt to accept the same ride simultaneously. Solved with an atomic SQL update:

```sql
UPDATE rides
SET status = 'ACCEPTED', driver_id = $1, accepted_at = NOW()
WHERE id = $2 AND status = 'REQUESTED'
```

Only one UPDATE can match `WHERE status = 'REQUESTED'`. The driver whose update returns `rowCount === 1` wins. Any other driver receives `ride:already_taken`.

### Sequential Driver Offer Queue

Rather than broadcasting to all nearby drivers simultaneously, the system offers the ride to one driver at a time starting with the nearest. An in-memory singleton (`RideRequestTracker`) manages:

- The ordered candidate queue
- Which driver is currently being offered
- A 15-second Node.js timeout per offer
- The set of drivers already offered this ride

If a driver rejects or times out, the system advances to the next candidate. If the queue is exhausted without acceptance, the ride is cancelled and the rider receives `ride:no_driver`.

---

## Ride Lifecycle

```
1. Rider submits ride:request via WebSocket
2. Backend creates Ride row (status = REQUESTED)
3. Haversine finds all available drivers within 5km
4. Candidate queue built, sorted nearest-first
5. ride:incoming sent to nearest driver
6. 15-second timeout starts

7a. Driver accepts → atomic SQL update
    → status = ACCEPTED
    → ride:accepted broadcast to ride room
    → ETA countdown starts on rider screen

7b. Driver rejects or times out
    → Next candidate in queue offered
    → Repeat from step 5
    → If queue exhausted → ride:no_driver → ride CANCELLED

8.  Driver emits driver:location every 3 seconds
    → driverLocation updates in rider's Zustand store
    → Driver marker moves on rider's map in real time

9.  Driver arrives → emits ride:status { status: ARRIVED }
    → Status validated (ACCEPTED → ARRIVED only)
    → ride:status_update broadcast

10. Driver starts ride → IN_PROGRESS
11. Driver completes ride → COMPLETED
    → final_fare set
    → Payment record created
    → Driver earnings incremented
    → Ride counts incremented for both parties
    → Both sockets leave the ride room

12. Rider rates driver → POST /api/ratings
    → Driver aggregate rating recomputed
```

---

## Architecture Decisions

**Raw SQL over ORM** — Using the `pg` driver directly gives full control over queries, makes the Haversine formula trivial to embed, and avoids ORM abstraction overhead in complex join queries.

**Monorepo with shared types** — The `@ridex/shared` package defines every TypeScript interface once. Backend services, frontend stores, and Socket.io event types all import from the same source, making type errors across the stack impossible.

**No Redis dependency** — Driver locations are written directly to PostgreSQL on every update. The sequential offer queue lives in Node.js process memory via the `RideRequestTracker` singleton. This simplifies local development and deployment without sacrificing correctness for the current scale.

**Free map stack** — Leaflet with CartoDB tiles, OSRM for routing, and Nominatim for geocoding replace Mapbox entirely. No API keys, no usage limits, no billing. The bundle size is also 7x smaller than Mapbox GL JS.

**Token refresh with request queue** — The Axios interceptor implements a `isRefreshing` flag with a `failedQueue` array. When a 401 fires, only one refresh request is sent. All other concurrent requests wait in the queue and retry automatically with the new token once the refresh completes.

**Socket.io rooms for targeted messaging** — Every driver has a personal room `driver:{userId}`. Every active ride has a room `ride:{rideId}`. This means the backend never needs to iterate through connections — it emits directly to the right room, which Socket.io handles internally.

---

## Total Endpoint Count

- **REST endpoints:** 29
- **Client WebSocket events:** 6
- **Server WebSocket events:** 9

---

## License

MIT