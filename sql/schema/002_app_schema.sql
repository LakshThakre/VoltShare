-- ====================================================================================================
-- 002_app_schema.sql - VoltShare Application Tables & Stored Procedures
-- ====================================================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'both',
    smart_meter_id TEXT,
    smart_meter_status TEXT DEFAULT 'active',
    household_load_kw NUMERIC,
    grid_tariff_inr NUMERIC DEFAULT 8.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance NUMERIC NOT NULL DEFAULT 0.00,
    energy_balance_kwh NUMERIC NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Energy Listings Table
CREATE TABLE IF NOT EXISTS public.energy_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    price_per_kwh NUMERIC NOT NULL,
    available_kwh NUMERIC NOT NULL,
    total_surplus_kwh NUMERIC,
    location_label TEXT,
    distance_km NUMERIC,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES public.profiles(id),
    seller_id UUID NOT NULL REFERENCES public.profiles(id),
    listing_id UUID REFERENCES public.energy_listings(id) ON DELETE SET NULL,
    kwh_purchased NUMERIC NOT NULL,
    price_per_kwh NUMERIC NOT NULL,
    transit_fee NUMERIC DEFAULT 2.00,
    total_cost NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Wallet Transactions Table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Generation Data Table
CREATE TABLE IF NOT EXISTS public.generation_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    hour_label TEXT NOT NULL,
    kwh_generated NUMERIC NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- STORED PROCEDURES & BUSINESS LOGIC
-- ============================================================================

-- Listing Energy Limit Trigger
CREATE OR REPLACE FUNCTION public.check_listing_energy_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_energy NUMERIC;
BEGIN
    SELECT energy_balance_kwh INTO v_seller_energy
    FROM public.wallets
    WHERE user_id = NEW.seller_id;

    IF v_seller_energy IS NOT NULL AND NEW.available_kwh > v_seller_energy THEN
        RAISE EXCEPTION 'Cannot list % kWh. Seller only has % kWh available in their account.', NEW.available_kwh, v_seller_energy;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_listing_energy_limit ON public.energy_listings;
CREATE TRIGGER trg_check_listing_energy_limit
BEFORE INSERT OR UPDATE ON public.energy_listings
FOR EACH ROW EXECUTE FUNCTION public.check_listing_energy_limit();

-- Atomic Buy Energy Procedure
CREATE OR REPLACE FUNCTION public.buy_energy(
    p_buyer_id UUID,
    p_listing_id UUID,
    p_kwh NUMERIC
)
RETURNS TEXT
LANGUAGE plpgsql
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
    v_seller_name TEXT;
    v_buyer_name TEXT;
BEGIN
    SELECT seller_id, price_per_kwh, available_kwh
    INTO v_seller_id, v_price, v_available
    FROM public.energy_listings
    WHERE id = p_listing_id;

    IF v_available IS NULL OR v_available < p_kwh THEN
        RETURN 'Error: Not enough kWh available';
    END IF;

    v_total_cost := (p_kwh * v_price) + v_transit_fee;

    SELECT id, balance INTO v_buyer_wallet_id, v_buyer_balance
    FROM public.wallets
    WHERE user_id = p_buyer_id;

    IF v_buyer_wallet_id IS NULL OR v_buyer_balance < v_total_cost THEN
        RETURN 'Error: Insufficient balance';
    END IF;

    SELECT id INTO v_seller_wallet_id
    FROM public.wallets
    WHERE user_id = v_seller_id;

    IF v_seller_wallet_id IS NULL THEN
        INSERT INTO public.wallets (id, user_id, balance, energy_balance_kwh, created_at)
        VALUES (gen_random_uuid(), v_seller_id, 0.00, 50.0, now())
        RETURNING id INTO v_seller_wallet_id;
    END IF;

    SELECT full_name INTO v_seller_name FROM public.profiles WHERE id = v_seller_id;
    SELECT full_name INTO v_buyer_name FROM public.profiles WHERE id = p_buyer_id;

    -- Update buyer wallet
    UPDATE public.wallets
    SET balance = balance - v_total_cost,
        energy_balance_kwh = energy_balance_kwh + p_kwh
    WHERE id = v_buyer_wallet_id;

    -- Update seller wallet
    UPDATE public.wallets
    SET balance = balance + (p_kwh * v_price),
        energy_balance_kwh = GREATEST(0, energy_balance_kwh - p_kwh)
    WHERE id = v_seller_wallet_id;

    -- Update listing available kwh and active flag
    UPDATE public.energy_listings
    SET available_kwh = GREATEST(0, available_kwh - p_kwh),
        is_active = (available_kwh - p_kwh > 0.05)
    WHERE id = p_listing_id;

    -- Record transaction
    INSERT INTO public.transactions (
        id, buyer_id, seller_id, listing_id, kwh_purchased, price_per_kwh, transit_fee, total_cost, status, created_at
    ) VALUES (
        gen_random_uuid(), p_buyer_id, v_seller_id, p_listing_id, p_kwh, v_price, v_transit_fee, v_total_cost, 'completed', now()
    );

    -- Buyer ledger entry
    INSERT INTO public.wallet_transactions (
        id, wallet_id, type, title, amount, balance_after, created_at
    ) VALUES (
        gen_random_uuid(), v_buyer_wallet_id, 'debit', 'Purchased ' || p_kwh || ' kWh from ' || COALESCE(v_seller_name, 'Seller'),
        v_total_cost, v_buyer_balance - v_total_cost, now()
    );

    -- Seller ledger entry
    INSERT INTO public.wallet_transactions (
        id, wallet_id, type, title, amount, balance_after, created_at
    ) VALUES (
        gen_random_uuid(), v_seller_wallet_id, 'credit', 'Sold ' || p_kwh || ' kWh to ' || COALESCE(v_buyer_name, 'Buyer'),
        (p_kwh * v_price), (SELECT balance FROM public.wallets WHERE id = v_seller_wallet_id), now()
    );

    -- Seller notification
    INSERT INTO public.notifications (
        id, user_id, message, is_read, created_at
    ) VALUES (
        gen_random_uuid(),
        v_seller_id,
        'You sold ' || p_kwh || ' kWh to ' || COALESCE(v_buyer_name, 'Buyer') || ', ₹' || (p_kwh * v_price) || ' credited',
        false,
        now()
    );

    RETURN 'Success';
END;
$$;

-- Add Money Stored Procedure
CREATE OR REPLACE FUNCTION public.add_money(
    p_user_id UUID,
    p_amount NUMERIC
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_wallet_id UUID;
    v_new_balance NUMERIC;
BEGIN
    INSERT INTO public.wallets (id, user_id, balance, energy_balance_kwh, created_at)
    VALUES (gen_random_uuid(), p_user_id, p_amount, 0.0, now())
    ON CONFLICT (user_id) DO UPDATE
    SET balance = public.wallets.balance + p_amount
    RETURNING id, balance INTO v_wallet_id, v_new_balance;

    INSERT INTO public.wallet_transactions (
        id, wallet_id, type, title, amount, balance_after, created_at
    ) VALUES (
        gen_random_uuid(), v_wallet_id, 'credit', 'Added Balance via UPI', p_amount, v_new_balance, now()
    );

    RETURN 'Success';
END;
$$;

-- Withdraw Money Stored Procedure
CREATE OR REPLACE FUNCTION public.withdraw_money(
    p_user_id UUID,
    p_amount NUMERIC
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_wallet_id UUID;
    v_current_balance NUMERIC;
BEGIN
    SELECT id, balance INTO v_wallet_id, v_current_balance
    FROM public.wallets WHERE user_id = p_user_id;

    IF v_wallet_id IS NULL OR v_current_balance < p_amount THEN
        RETURN 'Error: Insufficient balance';
    END IF;

    UPDATE public.wallets
    SET balance = balance - p_amount
    WHERE id = v_wallet_id;

    INSERT INTO public.wallet_transactions (
        id, wallet_id, type, title, amount, balance_after, created_at
    ) VALUES (
        gen_random_uuid(), v_wallet_id, 'debit', 'Withdrawal to Bank / UPI', p_amount, v_current_balance - p_amount, now()
    );

    RETURN 'Success';
END;
$$;
