import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Seller } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { EnergyCard } from './EnergyCard';

interface SellerListItemProps {
  seller: Seller;
  onPress: (seller: Seller) => void;
  onBuyPress: (seller: Seller) => void;
}

export const SellerListItem: React.FC<SellerListItemProps> = ({ seller, onPress, onBuyPress }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(seller)} style={styles.container}>
      <EnergyCard style={styles.card}>
        <View style={styles.topRow}>
          <Image source={{ uri: seller.avatar }} style={styles.avatar} />

          <View style={styles.infoCol}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                {seller.name}
              </Text>
              {seller.isVerified && (
                <View style={[styles.verifiedBadge, { backgroundColor: colors.muted, borderColor: colors.surfaceBorder }]}>
                  <Ionicons name="checkmark" size={10} color={colors.textPrimary} />
                  <Text style={[styles.verifiedText, { color: colors.textPrimary }]}>Verified</Text>
                </View>
              )}
            </View>

            <View style={styles.subDetailRow}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.subText, { color: colors.textMuted }]}>
                {seller.distanceKm} km away • {seller.rating.toFixed(1)} ★
              </Text>
            </View>
          </View>

          <View style={[styles.kwhBadge, { backgroundColor: colors.solarGoldBg }]}>
            <Text style={[styles.kwhBadgeText, { color: colors.solarGold }]}>{seller.availableKwh} kWh</Text>
          </View>
        </View>

        <View style={[styles.bottomRow, { borderTopColor: colors.surfaceBorder }]}>
          <View>
            <Text style={[styles.price, { color: colors.creditGreen }]}>
              ₹ {seller.pricePerKwh.toFixed(2)}
              <Text style={[styles.priceUnit, { color: colors.textMuted }]}> / kWh</Text>
            </Text>
            <Text style={[styles.gridPriceComp, { color: colors.textMuted }]}>Grid Tariff: ₹ 8.00</Text>
          </View>

          <TouchableOpacity
            style={[styles.buyBtn, { backgroundColor: colors.primary }]}
            onPress={() => onBuyPress(seller)}
            activeOpacity={0.8}
          >
            <Text style={[styles.buyBtnText, { color: colors.primaryForeground }]}>Buy Energy</Text>
          </TouchableOpacity>
        </View>
      </EnergyCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    padding: 14,
    borderRadius: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  subDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subText: {
    fontSize: 12,
    fontWeight: '500',
  },
  kwhBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  kwhBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  gridPriceComp: {
    fontSize: 10,
    marginTop: 1,
  },
  buyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buyBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
