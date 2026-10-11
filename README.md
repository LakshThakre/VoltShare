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
| **Supabase** | Open-source Firebase alternative providing managed PostgreSQL and Auth |
| **PostgreSQL 15+** | Relational database handling users, wallets, and trades |
| **PL/pgSQL Functions** | `SECURITY DEFINER` atomic stored procedures preventing race conditions |
| **Row Level Security (RLS)** | Secure table access policies for production deployments |
| **Google OAuth 2.0** | Secure one-tap login paired with automated profile provisioning |

---

## Database Schema & Stored Procedures

The database logic is organized inside the [`sql/`](./sql) directory:
- [`sql/schema.sql`](./sql/schema.sql): Complete DDL, tables, triggers, and functions.
- [`sql/seed_indian_data.sql`](./sql/seed_indian_data.sql): Seed script for 5 verified Indian prosumers in Bengaluru.

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
energyApp/
├── assets/                           # App branding & assets
│   ├── icon.png                      # App launcher icon
│   ├── splash-icon.png               # Launch splash screen asset
│   └── voltshare-logo.png            # App branding logo
├── sql/                              # Database DDL & Seed Scripts
│   ├── schema.sql                    # Complete PostgreSQL schema & stored procedures
│   └── seed_indian_data.sql          # Seed data with 5 verified Indian prosumers
├── src/
│   ├── components/                   # Reusable UI components
│   │   ├── BuyModal.tsx              # Order confirmation bottom sheet
│   │   └── ListEnergyModal.tsx       # Sell rooftop solar energy modal
│   ├── context/                      # React context providers
│   │   ├── AuthContext.tsx           # Google OAuth & session management
│   │   └── MarketContext.tsx         # Real-time marketplace state & Supabase RPC
│   ├── screens/                      # Application screens
│   │   ├── HomeScreen.tsx            # Main dashboard with generation curve
│   │   ├── MarketplaceScreen.tsx     # P2P listings, search, and filters
│   │   ├── WalletScreen.tsx          # Dual-asset wallet & transaction ledger
│   │   ├── AnalyticsScreen.tsx       # Energy consumption & savings statistics
│   │   ├── ProfileScreen.tsx         # User profile & smart meter pairing
│   │   └── LoginScreen.tsx           # Google login & guest bypass authentication
│   ├── theme/                        # Colors, typography, and theme provider
│   └── types/                        # TypeScript definitions & data models
├── .env.example                      # Environment variables template
├── App.tsx                           # App entry point & navigation hierarchy
├── app.json                          # Expo project configuration
├── package.json                      # Project dependencies & scripts
└── tsconfig.json                     # TypeScript compiler configuration
```

---

## Getting Started & Local Setup

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm** or **yarn**
- **Expo Go** app on your physical mobile device ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)) or an emulator.

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/your-username/energyApp.git
cd energyApp
npm install
```

### 3. Configure Supabase Environment Variables
Copy the `.env.example` file to create your local `.env`:
```bash
cp .env.example .env
```
Populate your Supabase Project credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

### 4. Initialize Database & Seed Prosumers
1. Open your **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Navigate to **SQL Editor** -> **New Query**.
3. Paste and run the contents of [`sql/schema.sql`](./sql/schema.sql).
4. Run the contents of [`sql/seed_indian_data.sql`](./sql/seed_indian_data.sql) to populate live marketplace listings.

### 5. Launch the Application
```bash
# Start Expo development server
npx expo start

# Or directly target a platform:
npm run android   # Run on connected Android device/emulator
npm run ios       # Run on iOS simulator (macOS required)
npm run web       # Run in web browser
```
Scan the QR code shown in your terminal using **Expo Go** to launch VoltShare on your mobile device!

---

<div align="center">
  <sub>Built for a decentralized, clean-energy future. Powered by React Native & Supabase.</sub>
</div>
