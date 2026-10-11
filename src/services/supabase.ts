import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

// Ensures WebBrowser completes any open session cleanly on web/mobile
WebBrowser.maybeCompleteAuthSession();

// Retrieve environment variables if provided
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Detect if real credentials have been configured
export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('your-project-id') &&
  !SUPABASE_ANON_KEY.includes('your-anon-key')
);

// Fallback placeholder credentials so createClient doesn't throw during unconfigured local dev
const effectiveUrl = isSupabaseConfigured ? SUPABASE_URL : 'https://placeholder-project.supabase.co';
const effectiveKey = isSupabaseConfigured ? SUPABASE_ANON_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const supabase = createClient(effectiveUrl, effectiveKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Parses authentication response code or tokens from an incoming redirect URL
 */
export async function handleAuthRedirectUrl(rawUrl: string): Promise<any | null> {
  if (!rawUrl) return null;

  try {
    let code: string | null = null;
    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    // Parse query string (?code=... or ?access_token=...)
    if (rawUrl.includes('?')) {
      const queryPart = rawUrl.split('?')[1].split('#')[0];
      const queryParams = new URLSearchParams(queryPart);
      code = queryParams.get('code');
      if (!accessToken) accessToken = queryParams.get('access_token');
      if (!refreshToken) refreshToken = queryParams.get('refresh_token');
    }

    // Parse hash fragment (#access_token=... or #code=...)
    if (rawUrl.includes('#')) {
      const hashPart = rawUrl.split('#')[1];
      const hashParams = new URLSearchParams(hashPart);
      if (!code) code = hashParams.get('code');
      if (!accessToken) accessToken = hashParams.get('access_token');
      if (!refreshToken) refreshToken = hashParams.get('refresh_token');
    }

    // Handle PKCE Authorization Code Grant
    if (code) {
      const { data: sessionData, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
      if (!exchangeError && sessionData?.user) {
        return sessionData.user;
      }
    }

    // Handle Implicit Grant Token
    if (accessToken) {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });
      if (!sessionError && sessionData?.user) {
        return sessionData.user;
      }
    }

    // Fallback verification
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  } catch (err) {
    console.warn('Error handling OAuth redirect URL:', err);
    return null;
  }
}

/**
 * Initiates Google OAuth Sign-In
 * Handles Web and Mobile (Expo AuthSession / WebBrowser)
 */
export async function signInWithGoogleOAuth(): Promise<{
  success: boolean;
  user?: any;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: 'Authentication configuration is missing. Please check your .env settings.',
    };
  }

  try {
    const redirectUrl = AuthSession.makeRedirectUri({
      scheme: 'voltshare',
      path: 'auth/callback',
    });
    console.log('[Auth] Generated OAuth Redirect URI:', redirectUrl);

    if (Platform.OS === 'web') {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : redirectUrl,
        },
      });
      if (error) throw error;
      return { success: true };
    } else {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (result.type === 'success' && result.url) {
          const user = await handleAuthRedirectUrl(result.url);
          if (user) {
            return { success: true, user };
          }
        }
      }

      // Check if session was captured by listener
      const { data: { session: finalSession } } = await supabase.auth.getSession();
      if (finalSession?.user) {
        return { success: true, user: finalSession.user };
      }

      return {
        success: false,
        error: 'Google Sign-In was cancelled or not completed.',
      };
    }
  } catch (err: any) {
    console.warn('Google OAuth notice:', err.message);
    return {
      success: false,
      error: err.message || 'Google Sign-In failed',
    };
  }
}

/**
 * Realtime Subscription manager for Supabase
 */
export function subscribeToRealtimeChanges(
  table: string,
  onPayload: (payload: any) => void
) {
  if (!isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel(`public:${table}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => {
        onPayload(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
