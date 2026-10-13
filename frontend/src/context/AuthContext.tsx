import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole } from '../types';
import { api } from '../services/api';

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  avatar_url?: string;
  phone: string;
  role: UserRole;
  isMeterConnected: boolean;
  meterId: string;
  address: string;
  hasCompletedOnboarding: boolean;
  isLoggedIn: boolean;
}

interface AuthContextType {
  user: UserProfile;
  isServerConnected: boolean;
  setRole: (role: UserRole) => void;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  connectSmartMeter: (meterId: string) => void;
  completeOnboarding: (name: string, email: string, role: UserRole) => void;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signupWithEmail: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; message?: string }>;
  loginWithPhone: (phone: string) => void;
  verifyOtp: (code: string) => boolean;
  logout: () => Promise<void>;
}

const defaultUser: UserProfile = {
  id: '',
  name: '',
  email: '',
  avatar_url: '',
  phone: '',
  role: 'Both',
  isMeterConnected: false,
  meterId: '',
  address: 'Local Smart Microgrid',
  hasCompletedOnboarding: false,
  isLoggedIn: false,
};

const AuthContext = createContext<AuthContextType>({
  user: defaultUser,
  isServerConnected: false,
  setRole: () => {},
  setUser: () => {},
  connectSmartMeter: () => {},
  completeOnboarding: () => {},
  loginWithEmail: async () => ({ success: true }),
  signupWithEmail: async () => ({ success: true }),
  loginWithPhone: () => {},
  verifyOtp: () => true,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [isServerConnected, setIsServerConnected] = useState<boolean>(false);

  // Restore authenticated session on mount via /api/auth/me
  const checkSession = useCallback(async () => {
    try {
      const res = await api.auth.me();
      if (res.data?.user) {
        const u = res.data.user;
        setUser({
          id: u.id,
          name: u.full_name || u.email.split('@')[0],
          email: u.email,
          avatar_url: u.avatar_url || '',
          phone: '',
          role: u.role === 'buyer' ? 'Buyer' : u.role === 'seller' ? 'Seller' : 'Both',
          meterId: u.smart_meter_id || `MTR-${u.id.substring(0, 4).toUpperCase()}`,
          isMeterConnected: true,
          address: 'Local Smart Microgrid',
          hasCompletedOnboarding: true,
          isLoggedIn: true,
        });
        setIsServerConnected(true);
      }
    } catch (_) {
      // Offline fallback
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const loginWithEmail = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    const res = await api.auth.login({ email, password });
    if (res.error) {
      return { success: false, message: res.error };
    }

    if (res.data?.user) {
      const u = res.data.user;
      setUser({
        id: u.id,
        name: u.full_name || email.split('@')[0],
        email: u.email,
        avatar_url: u.avatar_url || '',
        phone: '',
        role: u.role === 'buyer' ? 'Buyer' : u.role === 'seller' ? 'Seller' : 'Both',
        meterId: u.smart_meter_id || `MTR-${u.id.substring(0, 4).toUpperCase()}`,
        isMeterConnected: true,
        address: 'Local Smart Microgrid',
        hasCompletedOnboarding: true,
        isLoggedIn: true,
      });
      setIsServerConnected(true);
      return { success: true };
    }

    return { success: false, message: 'Invalid email or password' };
  };

  const signupWithEmail = async (
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ success: boolean; message?: string }> => {
    const res = await api.auth.signup({ email, password, fullName });
    if (res.error) {
      return { success: false, message: res.error };
    }

    if (res.data?.user) {
      const u = res.data.user;
      setUser({
        id: u.id,
        name: u.full_name || email.split('@')[0],
        email: u.email,
        avatar_url: '',
        phone: '',
        role: 'Both',
        meterId: u.smart_meter_id || `MTR-${u.id.substring(0, 4).toUpperCase()}`,
        isMeterConnected: true,
        address: 'Local Smart Microgrid',
        hasCompletedOnboarding: true,
        isLoggedIn: true,
      });
      setIsServerConnected(true);
      return { success: true };
    }

    return { success: false, message: 'Signup failed. Please try again.' };
  };

  const setRole = async (newRole: UserRole) => {
    setUser((prev) => ({ ...prev, role: newRole }));
    if (user.id) {
      try {
        await api.profile.updateProfile({ role: newRole.toLowerCase() });
      } catch (_) {}
    }
  };

  const connectSmartMeter = async (meterId: string) => {
    const assigned = meterId || `MTR-${Math.floor(1000 + Math.random() * 9000)}`;
    setUser((prev) => ({
      ...prev,
      isMeterConnected: true,
      meterId: assigned,
    }));
    if (user.id) {
      try {
        await api.profile.updateProfile({ smartMeterId: assigned });
      } catch (_) {}
    }
  };

  const completeOnboarding = (name: string, email: string, role: UserRole) => {
    setUser((prev) => ({
      ...prev,
      name: name || prev.name,
      email: email || prev.email,
      role: role || prev.role,
      hasCompletedOnboarding: true,
    }));
  };

  const loginWithPhone = (phone: string) => {
    setUser((prev) => ({
      ...prev,
      phone: phone || prev.phone,
    }));
  };

  const verifyOtp = (code: string): boolean => {
    if (code.length === 6) {
      setUser((prev) => ({
        ...prev,
        isLoggedIn: true,
        hasCompletedOnboarding: true,
      }));
      return true;
    }
    return false;
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (_) {}
    setUser(defaultUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isServerConnected,
        setRole,
        setUser,
        connectSmartMeter,
        completeOnboarding,
        loginWithEmail,
        signupWithEmail,
        loginWithPhone,
        verifyOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
