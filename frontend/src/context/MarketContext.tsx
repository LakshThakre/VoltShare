import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Seller, Transaction, FilterState } from '../types';
import { INITIAL_SELLERS } from '../data/mockData';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatTxDate(dateStr?: string): string {
  if (!dateStr) return 'Recent';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recent';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}

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
  publishListing: (params: {
    availableKwh: number;
    pricePerKwh: number;
    locationLabel?: string;
  }) => Promise<{ success: boolean; message: string }>;
}

const initialFilters: FilterState = {
  searchQuery: '',
  maxDistanceKm: 5,
  priceSort: 'asc',
  minKwhAvailable: 0,
  onlyVerified: false,
};

const MarketContext = createContext<MarketContextType>({
  sellers: INITIAL_SELLERS,
  transactions: [],
  walletBalance: 0.00,
  energyBalanceKwh: 0.0,
  listedEnergyKwh: 0.0,
  sellingRate: 5.20,
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
  buyEnergy: async () => ({ success: true, message: '' }),
  addFunds: async () => {},
  withdrawFunds: async () => ({ success: true, message: '' }),
  updateSellerRate: async () => {},
  publishListing: async () => ({ success: true, message: '' }),
});

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>(INITIAL_SELLERS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0.00);
  const [energyBalanceKwh, setEnergyBalanceKwh] = useState<number>(0.0);
  const [listedEnergyKwh, setListedEnergyKwh] = useState<number>(0.0);
  const [sellingRate, setSellingRate] = useState<number>(5.20);
  const [autoBuyEnabled, setAutoBuyEnabled] = useState<boolean>(true);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);

  // Load live data from local backend API
  const loadData = useCallback(async () => {
    try {
      // 1. Fetch Listings
      const listingsRes = await api.marketplace.getListings();
      if (listingsRes.data && listingsRes.data.length > 0) {
        const mappedSellers: Seller[] = listingsRes.data
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

        // Sync seller's own listing if present
        if (user.id) {
          const myListing = listingsRes.data.find((l: any) => l.seller_id === user.id);
          if (myListing && Number(myListing.available_kwh) > 0.05) {
            setListedEnergyKwh(Number(myListing.available_kwh));
            setSellingRate(Number(myListing.price_per_kwh));
          } else {
            setListedEnergyKwh(0.0);
          }
        }
      }

      // 2. Fetch User Wallet & Ledger
      if (user.id) {
        const walletRes = await api.wallet.getWallet();
        if (walletRes.data) {
          setWalletBalance(Number(walletRes.data.balance || 0));
          setEnergyBalanceKwh(Number(walletRes.data.energy_balance_kwh || 0));
        }

        const txRes = await api.wallet.getTransactions();
        if (txRes.data) {
          const loadedTxs: Transaction[] = [];

          if (txRes.data.walletTransactions && txRes.data.walletTransactions.length > 0) {
            txRes.data.walletTransactions.forEach((wt: any) => {
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
                timestamp: formatTxDate(wt.created_at),
                status: 'Completed',
                txHash: `#${wt.id.substring(0, 8)}`,
              });
            });
          }

          setTransactions(loadedTxs);
        }

        const notifRes = await api.wallet.getNotification();
        if (notifRes.data?.message) {
          setAlertBanner(notifRes.data.message);
        }

        setIsRealtimeActive(true);
      } else {
        setWalletBalance(0);
        setEnergyBalanceKwh(0);
        setTransactions([]);
      }
    } catch (e) {
      console.warn('API fetch warning:', e);
    }
  }, [user.id]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // Polling sync
    return () => clearInterval(interval);
  }, [loadData]);

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

    if (user.id) {
      try {
        await api.wallet.addFunds(amount);
      } catch (err) {
        console.warn('Add funds sync warning:', err);
      }
    }
  };

  const withdrawFunds = async (
    amount: number,
    destination: string
  ): Promise<{ success: boolean; message: string }> => {
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

    if (user.id) {
      try {
        const res = await api.wallet.withdraw(amount, destination);
        if (res.error) {
          return { success: false, message: res.error };
        }
      } catch (err) {
        console.warn('Withdraw sync warning:', err);
      }
    }

    return { success: true, message: `Successfully withdrawn ₹${amount.toFixed(2)} to ${destination}.` };
  };

  const refreshMarketplace = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const updateSellerRate = async (newRate: number) => {
    setSellingRate(newRate);
    if (user.id) {
      try {
        await api.marketplace.updateRate(newRate);
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

      const res = await api.marketplace.publishListing(params);
      if (res.error) {
        return { success: false, message: res.error };
      }

      await loadData();
      setAlertBanner(`Your ${params.availableKwh} kWh listing is live on the marketplace at ₹${params.pricePerKwh}/kWh!`);
      return { success: true, message: 'Listing published successfully!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to publish listing.' };
    }
  };

  const buyEnergy = async (
    seller: Seller,
    kwh: number
  ): Promise<{ success: boolean; message: string; tx?: Transaction }> => {
    const transitFee = 2.00;
    const energyCost = +(kwh * seller.pricePerKwh).toFixed(2);
    const totalCost = +(energyCost + transitFee).toFixed(2);

    if (walletBalance < totalCost) {
      return {
        success: false,
        message: `Insufficient balance. Balance is ₹${walletBalance.toFixed(2)}, required is ₹${totalCost.toFixed(2)}.`,
      };
    }

    if (seller.availableKwh < kwh) {
      return {
        success: false,
        message: `Seller only has ${seller.availableKwh} kWh available.`,
      };
    }

    // 1. Deduct local wallet & add energy
    const updatedBalance = +(walletBalance - totalCost).toFixed(2);
    setWalletBalance(updatedBalance);
    setEnergyBalanceKwh((prev) => +(prev + kwh).toFixed(1));

    // 2. Update seller remaining capacity
    const remainingKwh = +(seller.availableKwh - kwh).toFixed(1);
    setSellers((prev) =>
      prev
        .map((s) => (s.id === seller.id ? { ...s, availableKwh: remainingKwh } : s))
        .filter((s) => s.availableKwh > 0.05)
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

    // 4. Send to backend
    if (user.id) {
      try {
        const res = await api.marketplace.buyEnergy(seller.id, kwh);
        if (res.error) {
          console.warn('Backend buy error:', res.error);
        }
      } catch (err) {
        console.warn('buyEnergy exception:', err);
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
