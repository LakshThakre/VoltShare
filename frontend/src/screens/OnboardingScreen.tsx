import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const OnboardingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { completeOnboarding } = useAuth();
  const [currentSlide, setCurrentSlide] = useState<number>(0);

  const slides = [
    {
      icon: 'sunny' as const,
      iconColor: colors.solarGold,
      badge: 'Rooftop Solar Sellers',
      title: 'Monetize Rooftop Solar',
      desc: 'Sell excess daytime clean power directly to your neighborhood grid at fair market rates in INR (₹) instead of selling at lower net-metering feed-in tariffs.',
    },
    {
      icon: 'leaf' as const,
      iconColor: colors.creditGreen,
      badge: 'Neighborhood Buyers',
      title: 'Cheaper Green Energy',
      desc: 'Purchase 100% clean solar energy from verified local neighbors at up to 35% lower rates than the standard state electricity grid tariff.',
    },
    {
      icon: 'wallet' as const,
      iconColor: colors.textPrimary,
      badge: 'Smart Virtual Wallet',
      title: 'Instant INR Settlements',
      desc: 'Smart meters automatically sync generated units and consumption, settling payments in real time directly to your virtual INR wallet.',
    },
  ];

  const handleSkipOrFinish = () => {
    completeOnboarding('Laksh', 'laksh@gmail.com', 'Both');
    navigation.replace('MainTabs');
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleSkipOrFinish();
    }
  };

  const active = slides[currentSlide];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header Row with Skip */}
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Ionicons name="flash" size={20} color={colors.textPrimary} />
          <Text style={[styles.brandText, { color: colors.textPrimary }]}>VoltShare</Text>
        </View>

        <TouchableOpacity onPress={handleSkipOrFinish} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero Illustration Box */}
        <View style={[styles.heroBox, { backgroundColor: colors.muted, borderColor: colors.surfaceBorder }]}>
          <Ionicons name={active.icon} size={72} color={active.iconColor} />
          <View style={[styles.roleBadge, { backgroundColor: colors.card, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.roleBadgeText, { color: colors.textPrimary }]}>{active.badge}</Text>
          </View>
        </View>

        {/* Text Details */}
        <Text style={[styles.slideTitle, { color: colors.textPrimary }]}>{active.title}</Text>
        <Text style={[styles.slideDesc, { color: colors.textMuted }]}>{active.desc}</Text>

        {/* Carousel Dots */}
        <View style={styles.dotsRow}>
          {slides.map((_, idx) => {
            const isDotActive = idx === currentSlide;
            return (
              <View
                key={idx}
                style={[
                  styles.dot,
                  isDotActive
                    ? [styles.activeDot, { backgroundColor: colors.primary }]
                    : [styles.inactiveDot, { backgroundColor: colors.surfaceBorder }],
                ]}
              />
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
  },
  skipBtn: {
    padding: 6,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  heroBox: {
    width: '100%',
    height: 280,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 16,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 12,
  },
  slideDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 32,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 24,
  },
  inactiveDot: {
    width: 6,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  actionBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
