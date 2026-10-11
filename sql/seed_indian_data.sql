-- ================================================================================================================================================
-- VoltShare - 5 Random Indian Demo Users & Marketplace Data (Bengaluru Microgrid)
-- Copy & Run this SQL in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
-- ================================================================================================================================================

-- 1. Ensure required columns and tables exist
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS energy_balance_kwh NUMERIC NOT NULL DEFAULT 0.0;

CREATE TABLE IF NOT EXISTS public.generation_data (
    id UUID PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    hour_label TEXT NOT NULL,
    kwh_generated NUMERIC NOT NULL,
    recorded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ
);

-- 2. Enhanced buy_energy function (SECURITY DEFINER + auto-removes fully bought listings)
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

    -- Ensure buyer wallet exists with sufficient showcase balance
    IF v_buyer_wallet_id IS NULL THEN
        v_buyer_wallet_id := gen_random_uuid();
        INSERT INTO public.wallets (id, user_id, balance, energy_balance_kwh, created_at)
        VALUES (v_buyer_wallet_id, p_buyer_id, 1450.00, 0.0, now())
        ON CONFLICT (user_id) DO UPDATE SET balance = public.wallets.balance
        RETURNING id, balance INTO v_buyer_wallet_id, v_buyer_balance;
    END IF;

    IF v_buyer_balance IS NULL OR v_buyer_balance < v_total_cost THEN
        v_buyer_balance := GREATEST(1450.00, v_total_cost + 500.00);
        UPDATE public.wallets SET balance = v_buyer_balance WHERE id = v_buyer_wallet_id;
    END IF;

    SELECT id INTO v_seller_wallet_id
    FROM public.wallets
    WHERE user_id = v_seller_id;

    IF v_seller_wallet_id IS NULL THEN
        v_seller_wallet_id := gen_random_uuid();
        INSERT INTO public.wallets (id, user_id, balance, energy_balance_kwh, created_at)
        VALUES (v_seller_wallet_id, v_seller_id, 1000.00, 50.0, now())
        ON CONFLICT (user_id) DO UPDATE SET balance = public.wallets.balance
        RETURNING id INTO v_seller_wallet_id;
    END IF;

    SELECT full_name INTO v_seller_name FROM public.profiles WHERE id = v_seller_id;
    SELECT full_name INTO v_buyer_name FROM public.profiles WHERE id = p_buyer_id;

    UPDATE public.wallets
    SET balance = balance - v_total_cost,
        energy_balance_kwh = energy_balance_kwh + p_kwh
    WHERE id = v_buyer_wallet_id;

    UPDATE public.wallets
    SET balance = balance + (p_kwh * v_price),
        energy_balance_kwh = GREATEST(0, energy_balance_kwh - p_kwh)
    WHERE id = v_seller_wallet_id;

    -- Update listing surplus & DEACTIVATE listing if fully bought
    UPDATE public.energy_listings
    SET available_kwh = GREATEST(0, available_kwh - p_kwh),
        is_active = (available_kwh - p_kwh > 0.05)
    WHERE id = p_listing_id;

    INSERT INTO public.transactions (
        id, buyer_id, seller_id, listing_id, kwh_purchased, price_per_kwh, transit_fee, total_cost, status, created_at
    ) VALUES (
        gen_random_uuid(), p_buyer_id, v_seller_id, p_listing_id, p_kwh, v_price, v_transit_fee, v_total_cost, 'completed', now()
    );

    INSERT INTO public.wallet_transactions (
        id, wallet_id, type, title, amount, balance_after, created_at
    ) VALUES (
        gen_random_uuid(), v_buyer_wallet_id, 'debit', 'Purchased ' || p_kwh || ' kWh from ' || COALESCE(v_seller_name, 'Seller'),
        v_total_cost, v_buyer_balance - v_total_cost, now()
    );

    INSERT INTO public.wallet_transactions (
        id, wallet_id, type, title, amount, balance_after, created_at
    ) VALUES (
        gen_random_uuid(), v_seller_wallet_id, 'credit', 'Sold ' || p_kwh || ' kWh to ' || COALESCE(v_buyer_name, 'Buyer'),
        (p_kwh * v_price), (SELECT balance FROM public.wallets WHERE id = v_seller_wallet_id), now()
    );

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

-- 3. Enhanced add_money and withdraw_money functions
CREATE OR REPLACE FUNCTION public.add_money(
    p_user_id UUID,
    p_amount NUMERIC
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.withdraw_money(
    p_user_id UUID,
    p_amount NUMERIC
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 4. Ensure RLS permits logging transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read own transactions" ON public.transactions;
CREATE POLICY "Allow read own transactions" ON public.transactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert transactions" ON public.transactions;
CREATE POLICY "Allow insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read own history" ON public.wallet_transactions;
CREATE POLICY "Allow read own history" ON public.wallet_transactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert wallet history" ON public.wallet_transactions;
CREATE POLICY "Allow insert wallet history" ON public.wallet_transactions FOR INSERT WITH CHECK (true);

-- 5. Seed 5 Indian Prosumers and their listings
DO $$
DECLARE
    -- 5 Indian Prosumer User IDs
    v_aarav_id  UUID := '00000000-0000-0000-0000-000000000001';
    v_pooja_id  UUID := '00000000-0000-0000-0000-000000000002';
    v_rohan_id  UUID := '00000000-0000-0000-0000-000000000003';
    v_ananya_id UUID := '00000000-0000-0000-0000-000000000004';
    v_vikram_id UUID := '00000000-0000-0000-0000-000000000005';

    -- 5 Wallet IDs
    v_aarav_wallet_id  UUID := '10000000-0000-0000-0000-000000000001';
    v_pooja_wallet_id  UUID := '10000000-0000-0000-0000-000000000002';
    v_rohan_wallet_id  UUID := '10000000-0000-0000-0000-000000000003';
    v_ananya_wallet_id UUID := '10000000-0000-0000-0000-000000000004';
    v_vikram_wallet_id UUID := '10000000-0000-0000-0000-000000000005';

    -- 5 Listing IDs
    v_aarav_listing_id  UUID := '20000000-0000-0000-0000-000000000001';
    v_pooja_listing_id  UUID := '20000000-0000-0000-0000-000000000002';
    v_rohan_listing_id  UUID := '20000000-0000-0000-0000-000000000003';
    v_ananya_listing_id UUID := '20000000-0000-0000-0000-000000000004';
    v_vikram_listing_id UUID := '20000000-0000-0000-0000-000000000005';

    v_current_user_id UUID;
BEGIN
    -- 5.1. Insert 5 Indian Demo Users into auth.users (so foreign keys match)
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES
        (v_aarav_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'aarav.nair@voltshare.in', crypt('DemoPass@123', gen_salt('bf')), now(), '{"provider":"google"}', '{"full_name":"Aarav Nair"}', now(), now()),
        (v_pooja_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pooja.sharma@voltshare.in', crypt('DemoPass@123', gen_salt('bf')), now(), '{"provider":"google"}', '{"full_name":"Pooja Sharma"}', now(), now()),
        (v_rohan_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rohan.kulkarni@voltshare.in', crypt('DemoPass@123', gen_salt('bf')), now(), '{"provider":"google"}', '{"full_name":"Rohan Kulkarni"}', now(), now()),
        (v_ananya_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ananya.iyer@voltshare.in', crypt('DemoPass@123', gen_salt('bf')), now(), '{"provider":"google"}', '{"full_name":"Ananya Iyer"}', now(), now()),
        (v_vikram_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vikram.sengupta@voltshare.in', crypt('DemoPass@123', gen_salt('bf')), now(), '{"provider":"google"}', '{"full_name":"Vikramaditya Sengupta"}', now(), now())
    ON CONFLICT (id) DO NOTHING;

    -- 5.2. Insert Profiles for 5 Indian Users
    INSERT INTO public.profiles (
        id, full_name, email, avatar_url, role, smart_meter_id, smart_meter_status, household_load_kw, grid_tariff_inr, created_at
    ) VALUES
        (v_aarav_id,  'Aarav Nair', 'aarav.nair@voltshare.in', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'both', 'MTR-1081', 'active', 3.40, 8.00, now()),
        (v_pooja_id,  'Pooja Sharma', 'pooja.sharma@voltshare.in', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'seller', 'MTR-2044', 'active', 2.20, 8.00, now()),
        (v_rohan_id,  'Rohan Kulkarni', 'rohan.kulkarni@voltshare.in', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'seller', 'MTR-3092', 'active', 4.10, 8.00, now()),
        (v_ananya_id, 'Ananya Iyer', 'ananya.iyer@voltshare.in', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'both', 'MTR-4075', 'active', 1.80, 8.00, now()),
        (v_vikram_id, 'Vikramaditya Sengupta', 'vikram.sengupta@voltshare.in', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', 'seller', 'MTR-5011', 'active', 5.50, 8.00, now())
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        role = EXCLUDED.role;

    -- 5.3. Insert Wallets (Money Balance and Energy Surplus Balance)
    INSERT INTO public.wallets (id, user_id, balance, energy_balance_kwh, created_at) VALUES
        (v_aarav_wallet_id,  v_aarav_id,  1420.00, 28.00, now()),
        (v_pooja_wallet_id,  v_pooja_id,   890.00, 20.00, now()),
        (v_rohan_wallet_id,  v_rohan_id,  2150.00, 35.00, now()),
        (v_ananya_wallet_id, v_ananya_id, 1120.00, 18.00, now()),
        (v_vikram_wallet_id, v_vikram_id, 3400.00, 45.00, now())
    ON CONFLICT (user_id) DO UPDATE SET
        balance = EXCLUDED.balance,
        energy_balance_kwh = EXCLUDED.energy_balance_kwh;

    -- 5.4. Insert 5 Active Energy Marketplace Listings
    INSERT INTO public.energy_listings (
        id, seller_id, price_per_kwh, available_kwh, total_surplus_kwh, location_label, distance_km, is_active, created_at
    ) VALUES
        (v_aarav_listing_id,  v_aarav_id,  5.20, 18.5, 25.0, 'Indiranagar 100ft Rd, Bengaluru', 0.4, true, now()),
        (v_pooja_listing_id,  v_pooja_id,  4.90, 14.2, 20.0, 'Koramangala 4th Block, Bengaluru', 0.8, true, now()),
        (v_rohan_listing_id,  v_rohan_id,  5.40, 28.0, 35.0, 'HSR Layout Sector 2, Bengaluru', 1.2, true, now()),
        (v_ananya_listing_id, v_ananya_id, 4.80, 11.5, 16.0, 'HAL 2nd Stage, Bengaluru', 1.7, true, now()),
        (v_vikram_listing_id, v_vikram_id, 5.10, 32.0, 40.0, 'Whitefield Main Rd, Bengaluru', 2.4, true, now())
    ON CONFLICT (id) DO UPDATE SET
        price_per_kwh = EXCLUDED.price_per_kwh,
        available_kwh = EXCLUDED.available_kwh,
        total_surplus_kwh = EXCLUDED.total_surplus_kwh,
        location_label = EXCLUDED.location_label,
        distance_km = EXCLUDED.distance_km,
        is_active = true;

    -- 5.5. Insert Solar Generation Curves
    DELETE FROM public.generation_data WHERE seller_id IN (v_aarav_id, v_pooja_id, v_rohan_id, v_ananya_id, v_vikram_id);

    INSERT INTO public.generation_data (id, seller_id, hour_label, kwh_generated, recorded_at) VALUES
        (gen_random_uuid(), v_aarav_id, '06:00', 1.40, now() - INTERVAL '6 hours'),
        (gen_random_uuid(), v_aarav_id, '09:00', 4.20, now() - INTERVAL '3 hours'),
        (gen_random_uuid(), v_aarav_id, '12:00', 7.50, now()),
        (gen_random_uuid(), v_aarav_id, '15:00', 5.80, now() + INTERVAL '3 hours'),
        (gen_random_uuid(), v_aarav_id, '18:00', 1.80, now() + INTERVAL '6 hours');

    -- 5.6. Connect existing logged-in user with initial wallet balance & transactions
    SELECT id INTO v_current_user_id FROM public.profiles WHERE email NOT LIKE '%@voltshare.in' LIMIT 1;

    IF v_current_user_id IS NOT NULL THEN
        UPDATE public.wallets
        SET balance = 1450.00, energy_balance_kwh = 35.00
        WHERE user_id = v_current_user_id;

        INSERT INTO public.wallet_transactions (id, wallet_id, type, title, amount, balance_after, created_at)
        SELECT gen_random_uuid(), w.id, 'debit', 'Purchased 10 kWh from Aarav Nair', 54.00, 1396.00, now() - INTERVAL '3 hours'
        FROM public.wallets w WHERE w.user_id = v_current_user_id;

        INSERT INTO public.wallet_transactions (id, wallet_id, type, title, amount, balance_after, created_at)
        SELECT gen_random_uuid(), w.id, 'credit', 'Sold 5 kWh to Indiranagar Microgrid', 26.00, 1450.00, now() - INTERVAL '1 hour'
        FROM public.wallets w WHERE w.user_id = v_current_user_id;

        INSERT INTO public.wallet_transactions (id, wallet_id, type, title, amount, balance_after, created_at)
        SELECT gen_random_uuid(), w.id, 'credit', 'Added Balance via UPI', 500.00, 1424.00, now() - INTERVAL '1 day'
        FROM public.wallets w WHERE w.user_id = v_current_user_id;

        INSERT INTO public.notifications (id, user_id, message, is_read, created_at)
        VALUES (gen_random_uuid(), v_current_user_id, '⚡ Surplus solar power active: 5 verified sellers nearby.', false, now());
    END IF;

END $$;
