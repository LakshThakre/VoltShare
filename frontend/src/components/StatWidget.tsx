import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { EnergyCard } from './EnergyCard';

interface StatWidgetProps {
  title: string;
  value: string | number;
  unit?: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  trend?: string;
  trendIsPositive?: boolean;
  subtitle?: string;
}

export const StatWidget: React.FC<StatWidgetProps> = ({
  title,
  value,
  unit,
  iconName,
  trend,
  trendIsPositive = true,
  subtitle,
}) => {
  const { colors } = useTheme();

  return (
    <EnergyCard style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrapper, { backgroundColor: colors.secondary }]}>
          <Ionicons name={iconName} size={18} color={colors.textPrimary} />
        </View>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: colors.secondary, borderColor: colors.surfaceBorder }]}>
            <Ionicons
              name={trendIsPositive ? 'trending-up' : 'trending-down'}
              size={12}
              color={colors.textPrimary}
            />
            <Text style={[styles.trendText, { color: colors.textPrimary }]}>{trend}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
        {unit && <Text style={[styles.unit, { color: colors.textMuted }]}> {unit}</Text>}
      </View>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
    </EnergyCard>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    margin: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 12,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 4,
  },
});
