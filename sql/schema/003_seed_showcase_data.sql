-- ====================================================================================================
-- 003_seed_showcase_data.sql - VoltShare Showcase Demo Users, Listings & Transactions
-- ====================================================================================================

-- 1. Showcase Demo Users
-- Password for all demo accounts: DemoPass123!
INSERT INTO public.users (id, email, password_hash, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000000', 'demo@voltshare.com', '$argon2id$v=19$m=65536,t=3,p=4$7pbjWAdZoHF0cpsfCZ/Dzw$mINhJSh6HveA3xfUl5KRQcDRiaMs9b7R02UnphmVlUk', now() - interval '7 days'),
    ('00000000-0000-0000-0000-000000000001', 'aarav.nair@solar.in', '$argon2id$v=19$m=65536,t=3,p=4$7pbjWAdZoHF0cpsfCZ/Dzw$mINhJSh6HveA3xfUl5KRQcDRiaMs9b7R02UnphmVlUk', now() - interval '14 days'),
    ('00000000-0000-0000-0000-000000000002', 'pooja.sharma@solar.in', '$argon2id$v=19$m=65536,t=3,p=4$7pbjWAdZoHF0cpsfCZ/Dzw$mINhJSh6HveA3xfUl5KRQcDRiaMs9b7R02UnphmVlUk', now() - interval '14 days'),
    ('00000000-0000-0000-0000-000000000003', 'rohan.kulkarni@solar.in', '$argon2id$v=19$m=65536,t=3,p=4$7pbjWAdZoHF0cpsfCZ/Dzw$mINhJSh6HveA3xfUl5KRQcDRiaMs9b7R02UnphmVlUk', now() - interval '14 days'),
    ('00000000-0000-0000-0000-000000000004', 'ananya.iyer@solar.in', '$argon2id$v=19$m=65536,t=3,p=4$7pbjWAdZoHF0cpsfCZ/Dzw$mINhJSh6HveA3xfUl5KRQcDRiaMs9b7R02UnphmVlUk', now() - interval '14 days'),
    ('00000000-0000-0000-0000-000000000005', 'vikram.sengupta@solar.in', '$argon2id$v=19$m=65536,t=3,p=4$7pbjWAdZoHF0cpsfCZ/Dzw$mINhJSh6HveA3xfUl5KRQcDRiaMs9b7R02UnphmVlUk', now() - interval '14 days')
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 2. Profiles
INSERT INTO public.profiles (id, full_name, email, avatar_url, role, smart_meter_id, smart_meter_status, household_load_kw, grid_tariff_inr, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000000', 'VoltShare Demo Prosumer', 'demo@voltshare.com', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'both', 'MTR-DEMO-01', 'active', 3.5, 8.00, now() - interval '7 days'),
    ('00000000-0000-0000-0000-000000000001', 'Aarav Nair', 'aarav.nair@solar.in', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'seller', 'MTR-AARAV-01', 'active', 4.2, 8.00, now() - interval '14 days'),
    ('00000000-0000-0000-0000-000000000002', 'Pooja Sharma', 'pooja.sharma@solar.in', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'seller', 'MTR-POOJA-02', 'active', 2.8, 8.00, now() - interval '14 days'),
    ('00000000-0000-0000-0000-000000000003', 'Rohan Kulkarni', 'rohan.kulkarni@solar.in', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'seller', 'MTR-ROHAN-03', 'active', 5.0, 8.00, now() - interval '14 days'),
    ('00000000-0000-0000-0000-000000000004', 'Ananya Iyer', 'ananya.iyer@solar.in', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'seller', 'MTR-ANANYA-04', 'active', 3.1, 8.00, now() - interval '14 days'),
    ('00000000-0000-0000-0000-000000000005', 'Vikramaditya Sengupta', 'vikram.sengupta@solar.in', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', 'seller', 'MTR-VIKRAM-05', 'active', 6.2, 8.00, now() - interval '14 days')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    role = EXCLUDED.role,
    smart_meter_id = EXCLUDED.smart_meter_id,
    smart_meter_status = EXCLUDED.smart_meter_status,
    household_load_kw = EXCLUDED.household_load_kw;

-- 3. Wallets (Pre-funded with balances and energy credits)
INSERT INTO public.wallets (id, user_id, balance, energy_balance_kwh, created_at)
VALUES
    ('10000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 1250.00, 38.5, now() - interval '7 days'),
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 540.00, 25.0, now() - interval '14 days'),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 320.00, 20.0, now() - interval '14 days'),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 890.00, 35.0, now() - interval '14 days'),
    ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 210.00, 16.0, now() - interval '14 days'),
    ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 1150.00, 40.0, now() - interval '14 days')
ON CONFLICT (user_id) DO UPDATE SET
    balance = EXCLUDED.balance,
    energy_balance_kwh = EXCLUDED.energy_balance_kwh;

-- 4. Active Marketplace Energy Listings
INSERT INTO public.energy_listings (id, seller_id, price_per_kwh, available_kwh, total_surplus_kwh, location_label, distance_km, is_active, created_at)
VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 5.20, 18.5, 25.0, 'Indiranagar 100ft Rd, Bengaluru', 0.4, true, now() - interval '2 hours'),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 4.90, 14.2, 20.0, 'Koramangala 4th Block, Bengaluru', 0.8, true, now() - interval '3 hours'),
    ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 5.40, 28.0, 35.0, 'HSR Layout Sector 2, Bengaluru', 1.2, true, now() - interval '4 hours'),
    ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 4.80, 11.5, 16.0, 'HAL 2nd Stage, Bengaluru', 1.7, true, now() - interval '5 hours'),
    ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 5.10, 32.0, 40.0, 'Whitefield Main Rd, Bengaluru', 2.4, true, now() - interval '6 hours')
ON CONFLICT (id) DO UPDATE SET
    price_per_kwh = EXCLUDED.price_per_kwh,
    available_kwh = EXCLUDED.available_kwh,
    total_surplus_kwh = EXCLUDED.total_surplus_kwh,
    location_label = EXCLUDED.location_label,
    distance_km = EXCLUDED.distance_km,
    is_active = true;

-- 5. Solar Generation Curves (5 periods for Demo Prosumer & Top Sellers)
INSERT INTO public.generation_data (id, seller_id, hour_label, kwh_generated, recorded_at)
VALUES
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', '06:00', 1.4, now() - interval '6 hours'),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', '09:00', 4.2, now() - interval '4 hours'),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', '12:00', 7.5, now() - interval '2 hours'),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', '15:00', 5.8, now() - interval '1 hour'),
    (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', '18:00', 1.8, now())
ON CONFLICT (id) DO NOTHING;

-- 6. Sample Wallet Transactions for Demo User
INSERT INTO public.wallet_transactions (id, wallet_id, type, title, amount, balance_after, created_at)
VALUES
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000000', 'credit', 'Added Balance via UPI (GPay)', 1000.00, 1000.00, now() - interval '3 days'),
    ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000000', 'credit', 'Sold 15.0 kWh to Indiranagar Grid', 82.50, 1082.50, now() - interval '2 days'),
    ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000000', 'credit', 'Added Balance via UPI (PhonePe)', 500.00, 1582.50, now() - interval '1 day'),
    ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000000', 'debit', 'Purchased 10.0 kWh from Aarav Nair', 54.00, 1528.50, now() - interval '5 hours'),
    ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000000', 'debit', 'Withdrawal to Bank Account', 278.50, 1250.00, now() - interval '2 hours')
ON CONFLICT (id) DO NOTHING;

-- 7. Sample Trade Transactions
INSERT INTO public.transactions (id, buyer_id, seller_id, listing_id, kwh_purchased, price_per_kwh, transit_fee, total_cost, status, created_at)
VALUES
    ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 10.0, 5.20, 2.00, 54.00, 'completed', now() - interval '5 hours'),
    ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', NULL, 15.0, 5.50, 2.00, 84.50, 'completed', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- 8. Sample Notifications for Demo User
INSERT INTO public.notifications (id, user_id, message, is_read, created_at)
VALUES
    ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Welcome to VoltShare! Your smart meter MTR-DEMO-01 is active.', true, now() - interval '7 days'),
    ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Solar generation peaked at 7.5 kW at 12:00 PM today.', false, now() - interval '2 hours')
ON CONFLICT (id) DO NOTHING;
