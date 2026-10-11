import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const PhoneOtpScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { loginWithPhone, verifyOtp } = useAuth();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState<string>('9876543210');
  const [otpCode, setOtpCode] = useState<string>('5829');
  const [timer, setTimer] = useState<number>(42);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOtp = () => {
    if (phoneNumber.length >= 10) {
      loginWithPhone(`+91 ${phoneNumber}`);
      setStep('otp');
      setTimer(42);
    }
  };

  const handleVerify = () => {
    verifyOtp(otpCode.padEnd(6, '0'));
    navigation.replace('MainTabs');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        {/* Top Back Nav */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (step === 'otp') setStep('phone');
            else navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        {step === 'phone' ? (
          <View style={styles.formContent}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Enter your mobile number</Text>
            <Text style={[styles.subheading, { color: colors.textMuted }]}>
              We'll send a 6-digit verification code to register and verify your smart meter.
            </Text>

            <View style={[styles.phoneInputRow, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}>
              <View style={[styles.countryCodeBadge, { backgroundColor: colors.muted }]}>
                <Text style={[styles.countryCode, { color: colors.textPrimary }]}>🇮🇳 +91</Text>
              </View>
              <TextInput
                style={[styles.phoneInput, { color: colors.textPrimary }]}
                placeholder="98765 43210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: colors.primary, opacity: phoneNumber.length >= 10 ? 1 : 0.6 },
              ]}
              onPress={handleSendOtp}
              disabled={phoneNumber.length < 10}
            >
              <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Send OTP Code</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContent}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Verify phone number</Text>
            <Text style={[styles.subheading, { color: colors.textMuted }]}>
              Enter the 6-digit code sent to +91 {phoneNumber}
            </Text>

            {/* 6-digit OTP cells */}
            <View style={styles.otpBoxesRow}>
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const char = otpCode[idx] || '';
                const isFocused = idx === otpCode.length;
                return (
                  <View
                    key={idx}
                    style={[
                      styles.otpBox,
                      {
                        backgroundColor: colors.card,
                        borderColor: isFocused ? colors.primary : colors.surfaceBorder,
                        borderWidth: isFocused ? 2 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.otpDigit, { color: colors.textPrimary }]}>{char}</Text>
                  </View>
                );
              })}
            </View>

            <TextInput
              style={styles.hiddenInput}
              keyboardType="number-pad"
              maxLength={6}
              value={otpCode}
              onChangeText={setOtpCode}
              autoFocus
            />

            <View style={styles.timerRow}>
              <Text style={[styles.timerText, { color: colors.textMuted }]}>
                {timer > 0 ? `Resend code in 0:${timer < 10 ? '0' : ''}${timer}` : 'Didn’t get code?'}
              </Text>
              <TouchableOpacity onPress={() => (timer === 0 ? setTimer(42) : setStep('phone'))}>
                <Text style={[styles.linkText, { color: colors.primary }]}>
                  {timer === 0 ? 'Resend OTP' : 'Edit Number'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: colors.primary, opacity: otpCode.length >= 4 ? 1 : 0.6 },
              ]}
              onPress={handleVerify}
            >
              <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>Verify & Continue</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backBtn: {
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  formContent: {
    marginTop: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 6,
    marginBottom: 24,
  },
  countryCodeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 6,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '700',
  },
  hiddenInput: {
    height: 0,
    opacity: 0,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  timerText: {
    fontSize: 13,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
