import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const STORAGE_TOKEN_KEY = 'voltshare_session_token';

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:4000`;
    }
    return 'http://localhost:4000';
  }
  // When running on physical device via Expo Go, hostUri contains the computer IP (e.g. 172.16.169.105)
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host.includes('ngrok') || host.includes('exp.direct')) {
      return 'http://172.16.169.105:4000';
    }
    return `http://${host}:4000`;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000';
  }
  return 'http://localhost:4000';
}

export const API_BASE_URL = getApiBaseUrl();

async function getStoredToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
  } catch (_) {
    return null;
  }
}

export async function setStoredToken(token: string | null) {
  try {
    if (token) {
      await AsyncStorage.setItem(STORAGE_TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(STORAGE_TOKEN_KEY);
    }
  } catch (_) {}
}

async function request<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const token = await getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['Cookie'] = `vs_session=${token}`;
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
      credentials: 'include',
    });
    clearTimeout(timeoutId);

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        await setStoredToken(null);
      }
      return { error: json.error || `Request failed with status ${res.status}` };
    }

    return { data: json };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { error: `Connection timed out. Could not reach backend server at ${API_BASE_URL}.` };
    }
    return {
      error: `Cannot connect to backend server at ${API_BASE_URL}. Please ensure 'npm run dev:backend' is running!`,
    };
  }
}

export const api = {
  auth: {
    async signup(params: { email: string; password: string; fullName?: string }) {
      const res = await request<{ user: any; token: string }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      if (res.data?.token) {
        await setStoredToken(res.data.token);
      }
      return res;
    },

    async login(params: { email: string; password: string }) {
      const res = await request<{ user: any; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      if (res.data?.token) {
        await setStoredToken(res.data.token);
      }
      return res;
    },

    async logout() {
      try {
        await request('/api/auth/logout', { method: 'POST' });
      } finally {
        await setStoredToken(null);
      }
    },

    async me() {
      return request<{ user: any }>('/api/auth/me');
    },
  },

  marketplace: {
    async getListings() {
      return request<any[]>('/api/marketplace/listings');
    },

    async publishListing(params: {
      availableKwh: number;
      pricePerKwh: number;
      locationLabel?: string;
    }) {
      return request<{ success: boolean; listingId: string }>('/api/marketplace/listings', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },

    async updateRate(rate: number) {
      return request<{ success: boolean }>('/api/marketplace/rate', {
        method: 'PUT',
        body: JSON.stringify({ rate }),
      });
    },

    async buyEnergy(listingId: string, kwh: number) {
      return request<{ success: boolean; message: string }>('/api/marketplace/buy', {
        method: 'POST',
        body: JSON.stringify({ listingId, kwh }),
      });
    },
  },

  wallet: {
    async getWallet() {
      return request<{ id: string; balance: number; energy_balance_kwh: number }>('/api/wallet');
    },

    async addFunds(amount: number) {
      return request<{ success: boolean; balance: number }>('/api/wallet/add-funds', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
    },

    async withdraw(amount: number, destination: string) {
      return request<{ success: boolean; balance: number }>('/api/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount, destination }),
      });
    },

    async getTransactions() {
      return request<{ walletTransactions: any[]; tradeTransactions: any[] }>('/api/wallet/transactions');
    },

    async getNotification() {
      return request<{ message: string; is_read: boolean } | null>('/api/wallet/notifications');
    },
  },

  profile: {
    async getProfile(id?: string) {
      return request<any>(id ? `/api/profile/${id}` : '/api/profile');
    },

    async updateProfile(data: { fullName?: string; role?: string; smartMeterId?: string; avatarUrl?: string }) {
      return request<{ success: boolean; profile: any }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  },
};
