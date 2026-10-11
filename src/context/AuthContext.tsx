import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { UserRole } from '../types';
import {
  supabase,
  isSupabaseConfigured,
  signInWithGoogleOAuth,
  handleAuthRedirectUrl,
} from '../services/supabase';

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
  isSupabaseConnected: boolean;
  setRole: (role: UserRole) => void;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  connectSmartMeter: (meterId: string) => void;
  completeOnboarding: (name: string, email: string, role: UserRole) => void;
  loginWithGoogle: () => Promise<{ success: boolean; message?: string }>;
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
  address: '',
  hasCompletedOnboarding: false,
  isLoggedIn: false,
};

const AuthContext = createContext<AuthContextType>({
  user: defaultUser,
  isSupabaseConnected: isSupabaseConfigured,
  setRole: () => {},
  setUser: () => {},
  connectSmartMeter: () => {},
  completeOnboarding: () => {},
  loginWithGoogle: async () => ({ success: true }),
  loginWithPhone: () => {},
  verifyOtp: () => true,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(isSupabaseConfigured);

  // Sync Auth session on mount and handle deep links
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Handle deep links when app is opened or resumed
    const processDeepLinkUrl = async (url: string | null) => {
      if (!url) return;
      if (url.includes('code=') || url.includes('access_token=')) {
        try {
          WebBrowser.dismissAuthSession();
        } catch (_) {}
        const sbUser = await handleAuthRedirectUrl(url);
        if (sbUser) {
          await applySupabaseUser(sbUser);
        }
      }
    };

    Linking.getInitialURL().then(processDeepLinkUrl);
    const linkingSub = Linking.addEventListener('url', (event) => {
      processDeepLinkUrl(event.url);
    });

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          applySupabaseUser(session.user);
        }
      } catch (e) {
        console.warn('Session check warning:', e);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        applySupabaseUser(session.user);
      }
    });

    return () => {
      linkingSub.remove();
      subscription?.unsubscribe();
    };
  }, []);

  const applySupabaseUser = async (sbUser: any) => {
    if (!sbUser) return;

    const rawMeta = sbUser.user_metadata || {};
    const identityData = sbUser.identities?.[0]?.identity_data || {};

    let name =
      rawMeta.full_name ||
      rawMeta.name ||
      rawMeta.given_name ||
      identityData.full_name ||
      identityData.name ||
      identityData.given_name ||
      '';

    let email = sbUser.email || rawMeta.email || identityData.email || '';

    // If name is still blank, format cleanly from email prefix (e.g. laksh.sharma -> Laksh Sharma)
    if (!name && email) {
      const emailPrefix = email.split('@')[0];
      name = emailPrefix
        .split(/[._-]/)
        .filter(Boolean)
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }
    if (!name) name = 'Prosumer';

    let avatar =
      rawMeta.avatar_url ||
      rawMeta.picture ||
      identityData.avatar_url ||
      identityData.picture ||
      '';

    let role: UserRole = 'Both';
    let meterId = `MTR-${sbUser.id ? sbUser.id.substring(0, 4).toUpperCase() : '8821'}`;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sbUser.id)
        .maybeSingle();

      if (profile) {
        if (profile.full_name) name = profile.full_name;
        if (profile.email) email = profile.email;
        if (profile.avatar_url) avatar = profile.avatar_url;
        if (profile.role === 'buyer') role = 'Buyer';
        else if (profile.role === 'seller') role = 'Seller';
        else role = 'Both';
        if (profile.smart_meter_id) meterId = profile.smart_meter_id;
      } else {
        try {
          await supabase.from('profiles').upsert({
            id: sbUser.id,
            full_name: name,
            email: email,
            avatar_url: avatar,
            role: 'both',
            smart_meter_id: meterId,
            smart_meter_status: 'active',
            created_at: new Date().toISOString(),
          });
        } catch (_) {}

        try {
          await supabase.from('wallets').upsert({
            id: sbUser.id,
            user_id: sbUser.id,
            balance: 0.00,
            created_at: new Date().toISOString(),
          });
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Profile sync notice:', err);
    }

    setUser({
      id: sbUser.id,
      name,
      email,
      avatar_url: avatar,
      phone: sbUser.phone || '',
      role,
      meterId,
      isMeterConnected: true,
      address: 'Local Smart Microgrid',
      hasCompletedOnboarding: true,
      isLoggedIn: true,
    });
    setIsSupabaseConnected(true);
  };

  const setRole = async (newRole: UserRole) => {
    setUser((prev) => ({ ...prev, role: newRole }));

    if (isSupabaseConfigured && user.id) {
      try {
        await supabase
          .from('profiles')
          .update({ role: newRole.toLowerCase() })
          .eq('id', user.id);
      } catch (e) {
        console.warn('Could not update role:', e);
      }
    }
  };

  const connectSmartMeter = (meterId: string) => {
    setUser((prev) => ({
      ...prev,
      isMeterConnected: true,
      meterId: meterId || `MTR-${Math.floor(1000 + Math.random() * 9000)}`,
    }));
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

  const loginWithGoogle = async (): Promise<{ success: boolean; message?: string }> => {
    const res = await signInWithGoogleOAuth();
    if (res.success && res.user) {
      await applySupabaseUser(res.user);
      return { success: true };
    }

    // Check if session was updated via onAuthStateChange or Linking listener concurrently
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await applySupabaseUser(session.user);
      return { success: true };
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await applySupabaseUser(currentUser);
      return { success: true };
    }

    return {
      success: false,
      message: res.error || 'Google Sign-In was not completed. Please try again.',
    };
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
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // ignore
      }
    }
    setUser((prev) => ({
      ...prev,
      isLoggedIn: false,
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isSupabaseConnected,
        setRole,
        setUser,
        connectSmartMeter,
        completeOnboarding,
        loginWithGoogle,
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
