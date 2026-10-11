import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Seller, Transaction, FilterState } from '../types';
import { INITIAL_SELLERS, INITIAL_TRANSACTIONS } from '../data/mockData';
import {
  supabase,
  isSupabaseConfigured,
  subscribeToRealtimeChanges,
} from '../services/supabase';
import { useAuth } from './AuthContext';

const isValidUuid = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const generateUuid = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface MarketContextType {
  sellers: Seller[];
  transactions: Transaction[];
  walletBalance: number;
  energyBalanceKwh: number;
  listedEnergyKwh: number;
  sellingRate: number;
  setSellingRate: (rate: number) => void;
  autoBuyEnabled: boolean;
  filters: FilterState;
  selectedSeller: Seller | null;
  isRefreshing: boolean;
  alertBanner: string | null;
  isRealtimeActive: boolean;
  dismissAlertBanner: () => void;
  setSelectedSeller: (seller: Seller | null) => void;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  toggleAutoBuy: () => void;
  refreshMarketplace: () => Promise<void>;
  buyEnergy: (seller: Seller, kwh: number) => Promise<{ success: boolean; message: string; tx?: Transaction }>;
  addFunds: (amount: number) => Promise<void>;
  withdrawFunds: (amount: number, destination: string) => Promise<{ success: boolean; message: string }>;
  updateSellerRate: (newRate: number) => Promise<void>;
  publishListing: (params: { availableKwh: number; pricePerKwh: number; locationLabel?: string }) => Promise<{ success: boolean; message: string }>;
}

const initialFilters: FilterState = {
  searchQuery: '',
  maxDistanceKm: 10,
  priceSort: 'asc',
  minKwhAvailable: 0,
  onlyVerified: false,
  sortBy: 'price',
};

const MarketContext = createContext<MarketContextType>({
  sellers: [],
  transactions: [],
  walletBalance: 0.00,
  energyBalanceKwh: 0.0,
  listedEnergyKwh: 0.0,
  sellingRate: 5.50,
  setSellingRate: () => {},
  autoBuyEnabled: true,
  filters: initialFilters,
  selectedSeller: null,
  isRefreshing: false,
  alertBanner: null,
  isRealtimeActive: false,
  dismissAlertBanner: () => {},
  setSelectedSeller: () => {},
  setFilters: () => {},
  toggleAutoBuy: () => {},
  refreshMarketplace: async () => {},
  buyEnergy: async () => ({ success: false, message: '' }),
  addFunds: async () => {},
  withdrawFunds: async () => ({ success: false, message: '' }),
  updateSellerRate: async () => {},
  publishListing: async () => ({ success: false, message: '' }),
});

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>(INITIAL_SELLERS.filter((s) => s.availableKwh > 0.05));
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [walletBalance, setWalletBalance] = useState<number>(1450.00);
  const [energyBalanceKwh, setEnergyBalanceKwh] = useState<number>(28.0);
  const [listedEnergyKwh, setListedEnergyKwh] = useState<number>(0.0);
  const [sellingRate, setSellingRate] = useState<number>(5.20);
  const [autoBuyEnabled, setAutoBuyEnabled] = useState<boolean>(true);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(isSupabaseConfigured);

  const ensureActiveUserId = async (): Promise<string> => {
    if (isValidUuid(user.id)) return user.id!;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id && isValidUuid(session.user.id)) {
        return session.user.id;
      }
    } catch (_) {}
    return '00000000-0000-0000-0000-000000000001';
  };

  // Load live data from Supabase if configured
  const loadSupabaseData = useCallback(async () => {
    if (!isSupabaseConfigured) return;

    try {
      // 1. Fetch Listings (only active listings with surplus > 0.05 kWh)
      const { data: listingsData, error: listingsError } = await supabase
        .from('energy_listings')
        .select('*, profiles:seller_id(full_name, avatar_url)')
        .eq('is_active', true)
        .gt('available_kwh', 0.05);

      if (!listingsError && listingsData && listingsData.length > 0) {
        const mappedSellers: Seller[] = listingsData
          .filter((item: any) => Number(item.available_kwh) > 0.05)
          .map((item: any) => ({
            id: item.id,
            sellerId: item.seller_id,
            name: item.profiles?.full_name || 'Solar Neighbor',
            avatar: item.profiles?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            locationName: item.location_label || 'Local Microgrid',
            distanceKm: Number(item.distance_km || 1.2),
            latitude: 12.9716,
            longitude: 77.5946,
            pricePerKwh: Number(item.price_per_kwh),
            availableKwh: Number(item.available_kwh),
            totalCapacityKw: Number(item.total_surplus_kwh || item.available_kwh),
            rating: 4.9,
            reviewCount: 32,
            isVerified: true,
            energyType: 'Solar + Battery',
            panelBrand: 'Rooftop Solar Array',
            bio: 'Clean rooftop solar energy shared with local grid.',
          }));
        setSellers(mappedSellers);

        // Sync seller own listing if present
        if (user.id) {
          const myListing = listingsData.find((l: any) => l.seller_id === user.id);
          if (myListing && Number(myListing.available_kwh) > 0.05) {
            setListedEnergyKwh(Number(myListing.available_kwh));
            setSellingRate(Number(myListing.price_per_kwh));
          } else {
            setListedEnergyKwh(0.0);
          }
        }
      } else {
        setSellers(INITIAL_SELLERS.filter((s) => s.availableKwh > 0.05));
      }

      // 2. Fetch User Wallet (money and energy balances)
      const activeUserId = isValidUuid(user.id) ? user.id! : null;
      if (activeUserId) {
        let buyerWalletId = activeUserId;
        const { data: walletData } = await supabase
          .from('wallets')
          .select('id, balance, energy_balance_kwh')
          .eq('user_id', activeUserId)
          .maybeSingle();

        if (walletData) {
          buyerWalletId = walletData.id;
          if (Number(walletData.balance) >= 0) {
            setWalletBalance(Number(walletData.balance));
          }
          if (walletData.energy_balance_kwh != null && Number(walletData.energy_balance_kwh) >= 0) {
            setEnergyBalanceKwh(Number(walletData.energy_balance_kwh));
          }
        } else {
          try {
            await supabase.from('wallets').upsert({
              id: activeUserId,
              user_id: activeUserId,
              balance: 1450.00,
              energy_balance_kwh: 35.0,
              created_at: new Date().toISOString(),
            });
            setWalletBalance(1450.00);
            setEnergyBalanceKwh(35.0);
          } catch (_) {}
        }

        // 3. Fetch Transactions & Wallet Transactions
        const { data: txData } = await supabase
          .from('transactions')
          .select('*, buyer:buyer_id(full_name), seller:seller_id(full_name)')
          .or(`buyer_id.eq.${activeUserId},seller_id.eq.${activeUserId}`)
          .order('created_at', { ascending: false })
          .limit(20);

        const { data: wtxData } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('wallet_id', buyerWalletId)
          .order('created_at', { ascending: false })
          .limit(20);

        const loadedTxs: Transaction[] = [];

        if (wtxData && wtxData.length > 0) {
          wtxData.forEach((wt: any) => {
            const isCredit = wt.type === 'credit';
            let tType: 'Buy' | 'Sell' | 'Deposit' | 'Payout' = isCredit ? 'Deposit' : 'Payout';
            if (wt.title?.toLowerCase().includes('purchased')) tType = 'Buy';
            else if (wt.title?.toLowerCase().includes('sold')) tType = 'Sell';

            const kwhMatch = wt.title?.match(/(\d+(\.\d+)?)\s*kWh/i);
            const kwh = kwhMatch ? parseFloat(kwhMatch[1]) : 0;

            loadedTxs.push({
              id: wt.id,
              type: tType,
              sellerOrBuyerName: wt.title,
              kwhAmount: kwh,
              pricePerKwh: kwh > 0 ? +(Number(wt.amount) / kwh).toFixed(2) : 0,
              totalAmount: Number(wt.amount),
              timestamp: 'Recent',
              status: 'Completed',
              txHash: `#${wt.id.substring(0, 8)}`,
            });
          });
        } else if (txData && txData.length > 0) {
          txData.forEach((t: any) => {
            const isBuy = t.buyer_id === activeUserId;
            loadedTxs.push({
              id: t.id,
              type: isBuy ? 'Buy' : 'Sell',
              sellerOrBuyerName: isBuy ? (t.seller?.full_name || 'Solar Seller') : (t.buyer?.full_name || 'Buyer'),
              kwhAmount: Number(t.kwh_purchased),
              pricePerKwh: Number(t.price_per_kwh),
              totalAmount: Number(t.total_cost),
              timestamp: 'Recent',
              status: 'Completed',
              txHash: `#${t.id.substring(0, 8)}`,
            });
          });
        }

        if (loadedTxs.length > 0) {
          setTransactions(loadedTxs);
        } else {
          setTransactions(INITIAL_TRANSACTIONS);
        }

        // 4. Fetch Latest Notification
        const { data: notifData } = await supabase
          .from('notifications')
          .select('message')
          .eq('user_id', activeUserId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (notifData) {
          setAlertBanner(notifData.message);
        }
      }

      setIsRealtimeActive(true);
    } catch (e) {
      console.warn('Supabase fetch error, running on local cache:', e);
    }
  }, [user.id]);

  // Set up Realtime subscriptions on mount
  useEffect(() => {
    loadSupabaseData();

    if (!isSupabaseConfigured) return;

    const unsubListings = subscribeToRealtimeChanges('energy_listings', () => {
      loadSupabaseData();
    });

    const unsubTransactions = subscribeToRealtimeChanges('transactions', () => {
      loadSupabaseData();
    });

    const unsubWalletTransactions = subscribeToRealtimeChanges('wallet_transactions', () => {
      loadSupabaseData();
    });

    const unsubNotifications = subscribeToRealtimeChanges('notifications', (payload) => {
      if (payload.new?.message) {
        setAlertBanner(payload.new.message);
      }
    });

    const unsubWallets = subscribeToRealtimeChanges('wallets', (payload) => {
      if (payload.new && (!user.id || payload.new.user_id === user.id)) {
        if (payload.new.balance != null) setWalletBalance(Number(payload.new.balance));
        if (payload.new.energy_balance_kwh != null) setEnergyBalanceKwh(Number(payload.new.energy_balance_kwh));
      }
    });

    return () => {
      unsubListings();
      unsubTransactions();
      unsubWalletTransactions();
      unsubNotifications();
      unsubWallets();
    };
  }, [loadSupabaseData, user.id]);

  const dismissAlertBanner = () => {
    setAlertBanner(null);
  };

  const toggleAutoBuy = () => {
    setAutoBuyEnabled((prev) => !prev);
  };

  const addFunds = async (amount: number) => {
    const updated = +(walletBalance + amount).toFixed(2);
    setWalletBalance(updated);

    const txUuid = generateUuid();
    const newTx: Transaction = {
      id: txUuid,
      type: 'Deposit',
      sellerOrBuyerName: 'Added Balance via UPI',
      kwhAmount: 0,
      pricePerKwh: 0,
      totalAmount: amount,
      timestamp: 'Today, Just now',
      status: 'Completed',
      txHash: `#${txUuid.substring(0, 8)}`,
    };
    setTransactions((prev) => [newTx, ...prev]);

    if (isSupabaseConfigured) {
      try {
        const userId = await ensureActiveUserId();
        const { error: rpcErr } = await supabase.rpc('add_money', {
          p_user_id: userId,
          p_amount: amount,
        });

        if (rpcErr) {
          const { data: wRow } = await supabase
            .from('wallets')
            .select('id, balance')
            .eq('user_id', userId)
            .maybeSingle();

          const walletId = wRow?.id || userId;
          await supabase.from('wallets').upsert({
            id: walletId,
            user_id: userId,
            balance: updated,
            created_at: new Date().toISOString(),
          });

          await supabase.from('wallet_transactions').insert({
            id: txUuid,
            wallet_id: walletId,
            type: 'credit',
            title: 'Added Balance via UPI',
            amount: amount,
            balance_after: updated,
            created_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('Supabase addFunds sync warning:', err);
      }
    }
  };

  const withdrawFunds = async (amount: number, destination: string): Promise<{ success: boolean; message: string }> => {
    if (amount <= 0 || isNaN(amount)) {
      return { success: false, message: 'Please enter a valid withdrawal amount.' };
    }
    if (amount > walletBalance) {
      return { success: false, message: `Insufficient balance. Available is ₹${walletBalance.toFixed(2)}.` };
    }

    const updated = +(walletBalance - amount).toFixed(2);
    setWalletBalance(updated);

    const txUuid = generateUuid();
    const newTx: Transaction = {
      id: txUuid,
      type: 'Payout',
      sellerOrBuyerName: `Withdrawn to ${destination || 'Bank Account'}`,
      kwhAmount: 0,
      pricePerKwh: 0,
      totalAmount: amount,
      timestamp: 'Today, Just now',
      status: 'Completed',
      txHash: `#${txUuid.substring(0, 8)}`,
    };
    setTransactions((prev) => [newTx, ...prev]);

    if (isSupabaseConfigured) {
      try {
        const userId = await ensureActiveUserId();
        const { error: rpcErr } = await supabase.rpc('withdraw_money', {
          p_user_id: userId,
          p_amount: amount,
        });

        if (rpcErr) {
          const { data: wRow } = await supabase
            .from('wallets')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          const walletId = wRow?.id || userId;
          await supabase
            .from('wallets')
            .update({ balance: updated })
            .eq('id', walletId);

          await supabase.from('wallet_transactions').insert({
            id: txUuid,
            wallet_id: walletId,
            type: 'debit',
            title: `Withdrawn to ${destination || 'Bank Account'}`,
            amount: amount,
            balance_after: updated,
            created_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('Supabase withdrawFunds sync warning:', err);
      }
    }

    return { success: true, message: `Successfully withdrawn ₹${amount.toFixed(2)} to ${destination}.` };
  };

  const refreshMarketplace = async () => {
    setIsRefreshing(true);
    if (isSupabaseConfigured) {
      await loadSupabaseData();
    } else {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    setIsRefreshing(false);
  };

  const updateSellerRate = async (newRate: number) => {
    setSellingRate(newRate);
    if (isSupabaseConfigured && user.id) {
      try {
        await supabase
          .from('energy_listings')
          .update({ price_per_kwh: newRate })
          .eq('seller_id', user.id);
      } catch (err) {
        console.warn('Rate update sync error:', err);
      }
    }
  };

  const publishListing = async (params: {
    availableKwh: number;
    pricePerKwh: number;
    locationLabel?: string;
  }): Promise<{ success: boolean; message: string }> => {
    if (!user.id) {
      return { success: false, message: 'Please sign in to list energy on the market.' };
    }
    if (params.availableKwh <= 0) {
      return { success: false, message: 'Please enter a valid surplus amount greater than 0 kWh.' };
    }
    if (params.pricePerKwh <= 0) {
      return { success: false, message: 'Please enter a valid price per kWh.' };
    }
    if (params.availableKwh > energyBalanceKwh) {
      return {
        success: false,
        message: `Cannot sell ${params.availableKwh} kWh. Your account only has ${energyBalanceKwh.toFixed(1)} kWh available.`,
      };
    }

    try {
      setListedEnergyKwh(params.availableKwh);
      setSellingRate(params.pricePerKwh);

      if (isSupabaseConfigured) {
        const { data: existing } = await supabase
          .from('energy_listings')
          .select('id')
          .eq('seller_id', user.id)
          .maybeSingle();

        const listingId = existing?.id || generateUuid();

        const { error } = await supabase
          .from('energy_listings')
          .upsert({
            id: listingId,
            seller_id: user.id,
            price_per_kwh: params.pricePerKwh,
            available_kwh: params.availableKwh,
            total_surplus_kwh: energyBalanceKwh,
            location_label: params.locationLabel || user.address || 'Local Microgrid',
            distance_km: 0.5,
            is_active: true,
            created_at: new Date().toISOString(),
          });

        if (error) {
          console.warn('Publish listing error:', error);
          return { success: false, message: error.message };
        }

        await loadSupabaseData();
      } else {
        const newSeller: Seller = {
          id: `SELLER-${Date.now()}`,
          sellerId: user.id,
          name: user.name || 'My Solar Array',
          avatar: user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          locationName: params.locationLabel || 'Local Microgrid',
          distanceKm: 0.1,
          latitude: 12.9716,
          longitude: 77.5946,
          pricePerKwh: params.pricePerKwh,
          availableKwh: params.availableKwh,
          totalCapacityKw: params.availableKwh,
          rating: 5.0,
          reviewCount: 1,
          isVerified: true,
          energyType: 'Solar',
          panelBrand: 'Monocrystalline Solar',
          bio: 'Live surplus rooftop energy from my smart meter.',
        };
        setSellers((prev) => [newSeller, ...prev.filter((s) => s.id !== newSeller.id)]);
      }

      setAlertBanner(`Your ${params.availableKwh} kWh listing is live on the marketplace at ₹${params.pricePerKwh}/kWh!`);
      return { success: true, message: 'Listing published successfully!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to publish listing.' };
    }
  };

  const buyEnergy = async (seller: Seller, kwh: number): Promise<{ success: boolean; message: string; tx?: Transaction }> => {
    const transitFee = 2.00;
    const energyCost = +(kwh * seller.pricePerKwh).toFixed(2);
    const totalCost = +(energyCost + transitFee).toFixed(2);

    if (walletBalance < totalCost) {
      return {
        success: false,
        message: `Insufficient balance. Balance is ₹${walletBalance.toFixed(2)}, required is ₹${totalCost.toFixed(2)}.`
      };
    }

    if (seller.availableKwh < kwh) {
      return {
        success: false,
        message: `Seller only has ${seller.availableKwh} kWh available.`
      };
    }

    // 1. Deduct local wallet & add energy
    const updatedBalance = +(walletBalance - totalCost).toFixed(2);
    setWalletBalance(updatedBalance);
    setEnergyBalanceKwh((prev) => +(prev + kwh).toFixed(1));

    // 2. Update seller remaining capacity & REMOVE listing if bought fully
    const remainingKwh = +(seller.availableKwh - kwh).toFixed(1);
    setSellers((prev) =>
      prev
        .map((s) => (s.id === seller.id ? { ...s, availableKwh: remainingKwh } : s))
        .filter((s) => s.availableKwh > 0.05) // REMOVE listing from marketplace if bought fully!
    );
    if (remainingKwh <= 0.05 && selectedSeller?.id === seller.id) {
      setSelectedSeller(null);
    }

    // 3. Create local transaction record immediately
    const txUuid = generateUuid();
    const newTx: Transaction = {
      id: txUuid,
      type: 'Buy',
      sellerOrBuyerName: seller.name,
      kwhAmount: kwh,
      pricePerKwh: seller.pricePerKwh,
      totalAmount: totalCost,
      timestamp: 'Today, Just now',
      status: 'Completed',
      txHash: `#${txUuid.substring(0, 8)}`,
    };
    setTransactions((prev) => [newTx, ...prev]);

    // 4. Send to Supabase
    if (isSupabaseConfigured) {
      try {
        const buyerId = await ensureActiveUserId();

        // Call RPC function buy_energy
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('buy_energy', {
          p_buyer_id: buyerId,
          p_listing_id: seller.id,
          p_kwh: kwh,
        });

        console.log('buy_energy RPC response:', { rpcRes, rpcErr });

        if (rpcErr || (typeof rpcRes === 'string' && rpcRes.startsWith('Error:'))) {
          console.warn('RPC buy_energy fallback:', rpcErr?.message || rpcRes);

          let buyerWalletId = buyerId;
          const { data: wRow } = await supabase
            .from('wallets')
            .select('id')
            .eq('user_id', buyerId)
            .maybeSingle();
          if (wRow?.id) buyerWalletId = wRow.id;

          await supabase
            .from('wallets')
            .update({ balance: updatedBalance, energy_balance_kwh: +(energyBalanceKwh + kwh).toFixed(1) })
            .eq('user_id', buyerId);

          // Update listing: set inactive and remove if bought fully
          await supabase
            .from('energy_listings')
            .update({
              available_kwh: Math.max(0, remainingKwh),
              is_active: remainingKwh > 0.05,
            })
            .eq('id', seller.id);

          await supabase.from('transactions').insert({
            id: txUuid,
            buyer_id: buyerId,
            seller_id: seller.sellerId || seller.id,
            listing_id: seller.id,
            kwh_purchased: kwh,
            price_per_kwh: seller.pricePerKwh,
            transit_fee: transitFee,
            total_cost: totalCost,
            status: 'completed',
            created_at: new Date().toISOString(),
          });

          await supabase.from('wallet_transactions').insert({
            id: generateUuid(),
            wallet_id: buyerWalletId,
            type: 'debit',
            title: `Purchased ${kwh} kWh from ${seller.name}`,
            amount: totalCost,
            balance_after: updatedBalance,
            created_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('Supabase buyEnergy exception:', err);
      }
    }

    return {
      success: true,
      message: `Successfully purchased ${kwh} kWh from ${seller.name} for ₹${totalCost.toFixed(2)}!`,
      tx: newTx,
    };
  };

  return (
    <MarketContext.Provider
      value={{
        sellers,
        transactions,
        walletBalance,
        energyBalanceKwh,
        listedEnergyKwh,
        sellingRate,
        setSellingRate,
        autoBuyEnabled,
        filters,
        selectedSeller,
        isRefreshing,
        alertBanner,
        isRealtimeActive,
        dismissAlertBanner,
        setSelectedSeller,
        setFilters,
        toggleAutoBuy,
        refreshMarketplace,
        buyEnergy,
        addFunds,
        withdrawFunds,
        updateSellerRate,
        publishListing,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => useContext(MarketContext);
