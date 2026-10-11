import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const res = await loginWithGoogle();
      setLoading(false);
      if (res.success) {
        navigation.replace('MainTabs');
      } else {
        Alert.alert('Sign-In Note', res.message || 'Please check your connection and try again.');
      }
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Sign In', e.message || 'Error signing in.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Logo and App Title matching Figma 01 */}
        <View style={styles.brandContainer}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Text style={[styles.logoText, { color: colors.primaryForeground }]}>V</Text>
          </View>
          <View style={styles.titleContainer}>
            <Text style={[styles.appName, { color: colors.textPrimary }]}>VoltShare</Text>
            <Text style={[styles.appTagline, { color: colors.textMuted }]}>
              Peer-to-Peer Rooftop Energy Trading
            </Text>
          </View>
        </View>

        {/* Action Button matching Figma Screen 01 */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.googleBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={handleGoogleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <>
                {/* Monochrome Google G logo from Figma */}
                <Svg width={18} height={18} viewBox="0 0 24 24" style={styles.googleIcon}>
                  <Path
                    fill={colors.textPrimary}
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <Path
                    fill={colors.textPrimary}
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <Path
                    fill={colors.textPrimary}
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <Path
                    fill={colors.textPrimary}
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </Svg>
                <Text style={[styles.googleBtnText, { color: colors.textPrimary }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.termsText, { color: colors.textMuted }]}>
            By continuing you agree to VoltShare Terms and Conditions
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    paddingHorizontal: 24,
    gap: 32,
  },
  brandContainer: {
    alignItems: 'center',
    gap: 14,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  titleContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionContainer: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: 12,
  },
  googleBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
    maxWidth: 250,
  },
});
