import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { EnergyCard } from './EnergyCard';

export const LoadingSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <EnergyCard key={index} style={styles.card}>
          <View style={styles.topRow}>
            <View style={[styles.avatarSkeleton, { backgroundColor: colors.surfaceBorder }]} />
            <View style={styles.col}>
              <View style={[styles.lineLong, { backgroundColor: colors.surfaceBorder }]} />
              <View style={[styles.lineShort, { backgroundColor: colors.surfaceBorder }]} />
            </View>
            <View style={[styles.priceSkeleton, { backgroundColor: colors.surfaceBorder }]} />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />
          <View style={styles.bottomRow}>
            <View style={[styles.barSkeleton, { backgroundColor: colors.surfaceBorder }]} />
            <View style={[styles.btnSkeleton, { backgroundColor: colors.surfaceBorder }]} />
          </View>
        </EnergyCard>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    marginVertical: 6,
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSkeleton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  col: {
    flex: 1,
  },
  lineLong: {
    height: 14,
    width: '70%',
    borderRadius: 6,
    marginBottom: 8,
  },
  lineShort: {
    height: 10,
    width: '40%',
    borderRadius: 5,
  },
  priceSkeleton: {
    width: 50,
    height: 24,
    borderRadius: 6,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barSkeleton: {
    height: 14,
    width: 120,
    borderRadius: 6,
  },
  btnSkeleton: {
    height: 32,
    width: 90,
    borderRadius: 8,
  },
});
