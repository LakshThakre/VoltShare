# VoltShare

### Decentralized Peer-to-Peer (P2P) Rooftop Solar Energy Trading Platform

A mobile-first clean-tech decentralized marketplace empowering rooftop solar prosumers to trade surplus green energy directly with neighborhood consumers in local microgrids.

---

## Table of Contents

- [Overview & Problem Statement](#overview--problem-statement)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Database Schema & Stored Procedures](#database-schema--stored-procedures)
- [Project Directory Structure](#project-directory-structure)
- [Getting Started & Local Setup](#getting-started--local-setup)

---

## Overview & Problem Statement

### The Problem
- **Feed-in Tariff Penalty**: Traditional utility grid feed-in tariffs in urban microgrids pay prosumers merely **₹2.00 – ₹3.00 per kWh** for excess rooftop solar electricity pumped back into the grid.
- **High Consumer Bills**: At the same time, neighboring households pay peak grid utility tariffs between **₹7.50 – ₹9.00 per kWh**.
- **Distribution Grid Congestion**: Peak midday solar generation often leads to inverter curtailment or grid instability because energy cannot be traded locally between adjacent premises.

### The VoltShare Solution
VoltShare establishes a decentralized, neighborhood-level peer-to-peer (P2P) energy trading network.
1. **Fair Value for Producers**: Solar owners can list their surplus clean electricity at competitive rates (e.g., **₹5.20 / kWh**), boosting their revenue by **over 70%** compared to standard net-metering.
2. **Savings for Consumers**: Neighborhood buyers purchase clean solar energy at rates significantly below the utility grid tariff, reducing monthly electricity costs by **over 35%**.
3. **Atomic Settlements**: All trades settle instantaneously with automated wheeling transit charges (₹2.00) and atomic balance updates executed directly in PostgreSQL stored procedures.

---

## Key Features

### 1. Multi-Role Dynamic Dashboard
- **Role Switcher**: Switch seamlessly between **Buyer**, **Seller**, or **Both (Prosumer)** modes with immediate UI reconfiguration.
- **Live Generation Curve**: 5-period visualizer mapping the prosumer's daily 24-hour solar generation curve, highlighting peak midday output at 12:00 PM.
- **Smart Meter Virtual Pairing**: Tracks hardware meter state (`#MTR-XXXX`), pairing status, and live grid tariff benchmarks (₹8.00/kWh).

### 2. Localized P2P Marketplace
- **Proximity-Based Discovery**: Discover rooftop solar generators within walking distance (`< 1 km`) across Bengaluru microgrid hubs (Koramangala, Indiranagar, HSR Layout, Whitefield, Jayanagar).
- **Smart Sorting & Filtering**: Sort by lowest price, filter by solar-only power, or search by seller name and neighborhood.
- **Real-Time Supply Status**: Displays available kWh in real time with auto-removal once a listing is fully purchased.

### 3. Atomic Energy Settlements
- **Transparent Cost Breakdown**: Calculates energy base cost, transparent transit fee (₹2.00), and net payable amount.
- **Zero Double-Spending**: Handled via PostgreSQL stored procedures (`buy_energy`) that lock records, verify sufficient balances, transfer kWh, credit the seller, debit the buyer, and record ledger rows atomically.

### 4. Dual-Asset Energy Wallet
- **Dual Balance Display**: Displays both liquid fiat currency (**₹ INR**) and stored electricity (**kWh**).
- **Virtual Top-Up & UPI Payout**: Instant wallet funding and simulated UPI withdrawal requests.
- **Unified Transaction Ledger**: Color-coded transaction audit log (Green credit for solar energy sold, Orange debit for power purchased, Blue for wallet top-ups).

---

## Tech Stack

### Frontend & Mobile Architecture
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **React Native** | `0.81.5` | Cross-platform native mobile runtime |
| **Expo SDK** | `~54.0.37` | Mobile tooling, bundling, fonts & splash management |
| **TypeScript** | `~5.9.2` | Complete type safety across models, navigation, and API |
| **React Navigation** | `^7.2.0` | Native Stack navigator and Bottom Tabs |
| **React Native SVG** | `15.12.1` | Vector charts and UI illustrations |
| **AsyncStorage** | `2.2.0` | Local session persistence and offline fallback |
| **Expo Vector Icons** | `^15.0.3` | Ionicons icon set |

### Backend, Database & Cloud
| Technology | Description |
| :--- | :--- |
| **PostgreSQL 15** | Local Docker container with persistent named volume, bound to `127.0.0.1:5432` |
| **Node.js & Express** | Lightweight TypeScript backend API server running raw SQL via `pg` (no ORM) |
| **Argon2id & Sessions** | Password hashing via Argon2id, cryptographically secure 32-byte tokens, SHA-256 session storage |
| **PL/pgSQL Functions** | Atomic stored procedures (`buy_energy`, `add_money`, `withdraw_money`) preventing race conditions |

---

## Database Schema & Stored Procedures

The database logic is organized inside the [`sql/schema/`](./sql/schema) directory:
- [`sql/schema/001_auth_tables.sql`](./sql/schema/001_auth_tables.sql): Custom `users` and `sessions` schema.
- [`sql/schema/002_app_schema.sql`](./sql/schema/002_app_schema.sql): Complete DDL, tables, and atomic stored procedures (`buy_energy`, `add_money`, `withdraw_money`).

### Core Relational Tables
1. **`profiles`**: Stores user identity, Google OAuth metadata, smart meter ID, and grid tariff rates.
2. **`wallets`**: Maintains the user's financial balance (`balance` in INR) and energy balance (`energy_balance_kwh` in kWh).
3. **`energy_listings`**: Active marketplace offers detailing seller ID, price per kWh, surplus quantity, and locality.
4. **`transactions`**: Immutable ledger of energy purchase orders connecting buyer, seller, quantity, and transit fees.
5. **`wallet_transactions`**: Granular financial credit/debit audit trail for wallet deposits, withdrawals, and payouts.
6. **`generation_data`**: Hourly solar PV output points for generation curves.

### Atomic Stored Procedure: `buy_energy`
```sql
CREATE OR REPLACE FUNCTION public.buy_energy(
    p_buyer_id UUID,
    p_listing_id UUID,
    p_kwh NUMERIC
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_seller_id UUID;
    v_price NUMERIC;
    v_available NUMERIC;
    v_transit_fee NUMERIC := 2.00;
    v_total_cost NUMERIC;
    v_buyer_balance NUMERIC;
    v_buyer_wallet_id UUID;
    v_seller_wallet_id UUID;
BEGIN
    -- 1. Fetch and validate listing
    SELECT seller_id, price_per_kwh, available_kwh
    INTO v_seller_id, v_price, v_available
    FROM public.energy_listings WHERE id = p_listing_id;

    IF v_available IS NULL OR v_available < p_kwh THEN
        RETURN 'Error: Not enough kWh available';
    END IF;

    -- 2. Verify buyer balance
    v_total_cost := (p_kwh * v_price) + v_transit_fee;
    SELECT id, balance INTO v_buyer_wallet_id, v_buyer_balance
    FROM public.wallets WHERE user_id = p_buyer_id;

    IF v_buyer_balance < v_total_cost THEN
        RETURN 'Error: Insufficient balance';
    END IF;

    -- 3. Atomic financial & energy transfer
    UPDATE public.wallets 
    SET balance = balance - v_total_cost, energy_balance_kwh = energy_balance_kwh + p_kwh 
    WHERE id = v_buyer_wallet_id;

    UPDATE public.wallets 
    SET balance = balance + (p_kwh * v_price), energy_balance_kwh = GREATEST(0, energy_balance_kwh - p_kwh)
    WHERE user_id = v_seller_id;

    -- 4. Deduct listing and auto-close if depleted
    UPDATE public.energy_listings
    SET available_kwh = available_kwh - p_kwh,
        is_active = CASE WHEN (available_kwh - p_kwh) <= 0.05 THEN false ELSE true END
    WHERE id = p_listing_id;

    -- 5. Record immutable transaction receipt
    INSERT INTO public.transactions (id, buyer_id, seller_id, listing_id, kwh_purchased, price_per_kwh, transit_fee, total_cost, status, created_at)
    VALUES (gen_random_uuid(), p_buyer_id, v_seller_id, p_listing_id, p_kwh, v_price, v_transit_fee, v_total_cost, 'completed', now());

    RETURN 'Success: Energy purchased successfully';
END;
$$;
```

---

## Project Directory Structure

```text
VoltShare/
├── docker-compose.yml                # PostgreSQL 15 container definition
├── .env.example                      # Environment variables template
├── .env                              # Gitignored local secrets
├── sql/                              # Database SQL Schema
│   └── schema/                       # Plain numbered SQL schema scripts
│       ├── 001_auth_tables.sql       # Custom users & sessions tables
│       └── 002_app_schema.sql        # VoltShare schema & stored procedures
├── backend/                          # Node.js Express API Server (Raw SQL via pg)
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app.ts                    # Express application & middleware
│   │   ├── index.ts                  # Server entrypoint (Port 4000)
│   │   ├── db.ts                     # PostgreSQL connection pool
│   │   ├── db-init.ts                # Database initialization script
│   │   ├── middleware/               # Auth, rate-limiting & CSRF middleware
│   │   └── routes/                   # Auth, marketplace, wallet, profile routes
│   └── tests/                        # Integration test suite (Argon2id, sessions, routes)
│       └── auth.test.ts
├── frontend/                         # React Native / Expo Mobile & Web App
│   ├── package.json
│   ├── tsconfig.json
│   ├── app.json
│   ├── App.tsx                       # Navigation hierarchy
│   ├── index.ts                      # Expo root entrypoint
│   ├── assets/                       # App icons & branding
│   └── src/
│       ├── components/               # Modals, charts, cards, list items
│       ├── context/                  # AuthContext & MarketContext
│       ├── navigation/               # RootNavigator & TabNavigator
│       ├── screens/                  # LoginScreen, HomeScreen, Marketplace, Wallet, etc.
│       ├── services/                 # api.ts (Backend HTTP client)
│       ├── theme/                    # Color tokens & theme provider
│       └── types/                    # Shared data models & filter state
└── package.json                      # Root convenience scripts
```

---

## Getting Started & Local Setup

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm** or **yarn**
- **Expo Go** app on your physical mobile device ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)) or an emulator.

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/your-username/VoltShare.git
cd VoltShare
npm install
```

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Docker & Docker Compose**: Installed and enabled on your system
- **Expo Go** app on physical mobile device or web browser

### 2. Configure Environment Variables
Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```
Ensure your database password is set in `.env` (already generated securely during setup):
```env
POSTGRES_USER=voltshare
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=voltshare
POSTGRES_PORT=5432
DATABASE_URL=postgresql://voltshare:your_secure_password@127.0.0.1:5432/voltshare
PORT=4000
EXPO_PUBLIC_API_URL=http://localhost:4000
```

### 3. Start the Local PostgreSQL Database in Docker
```bash
# Start Postgres in background (bound strictly to 127.0.0.1:5432)
docker compose up -d

# Check health status
docker compose ps
```

### 4. Initialize Database Schema
Initialize the database tables and stored procedures (`001_auth_tables.sql`, `002_app_schema.sql`):
```bash
npm run db:init
# or: npm run db:setup
```

### 5. Inspecting the Database
**Using CLI (`psql`):**
```bash
# Open interactive SQL terminal inside the container
docker compose exec db psql -U voltshare -d voltshare

# Inside psql, list all tables:
\dt

# Query users or active marketplace listings:
SELECT email, created_at FROM public.users;
SELECT price_per_kwh, available_kwh, location_label FROM public.energy_listings;

# Exit psql:
\q
```

**Using Graphical GUI (DBeaver on Arch Linux):**
```bash
sudo pacman -S dbeaver
```
Connection parameters in DBeaver:
- **Host**: `127.0.0.1` (or `localhost`)
- **Port**: `5432`
- **Database**: `voltshare`
- **Username**: `voltshare`
- **Password**: *(The password configured in your `.env`)*

---

### 6. Database Operations & Maintenance
- **Stop Database**:
  ```bash
  docker compose stop
  ```
  *Pauses the Postgres container without deleting any data.*

- **Start Database**:
  ```bash
  docker compose start
  ```
  *Resumes the existing container with all existing data intact.*

- **Wipe and Start Fresh (Rebuild from Scratch)**:
  ```bash
  docker compose down -v
  docker compose up -d
  npm run db:init
  ```
  > [!WARNING]
  > `docker compose down -v` permanently removes the named Docker volume (`voltshare_postgres_data`) and deletes all records. Use only when you want a clean slate.

- **System Reboots**:
  Because Docker is enabled via `systemd` and the container has `restart: unless-stopped`, the Postgres database automatically boots up on system startup. You can verify this anytime by running:
  ```bash
  docker ps
  ```

---

### 7. Launch the Application
```bash
# 1. Start backend server (Port 4000)
npm run dev:backend

# 2. In another terminal, start Expo React Native app (Default LAN Mode)
npm run dev:frontend

# (Optional: if your phone is on cellular data or different network, use Tunnel mode)
# npm run dev:frontend:tunnel
```
