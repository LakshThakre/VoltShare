import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useMarket } from '../context/MarketContext';
import { EnergyCard } from '../components/EnergyCard';
import { BuyModal } from '../components/BuyModal';

export const OfferDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { sellers } = useMarket();
  const sellerId = route.params?.sellerId;

  const seller = sellers.find((s) => s.id === sellerId) || sellers[0];
  const [isBuyModalOpen, setIsBuyModalOpen] = useState<boolean>(false);

  const stickyBottomPadding = Math.max(12, insets.bottom + 8);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Top Header Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.textPrimary }]}>Supplier Profile</Text>
        <TouchableOpacity style={styles.shareBtn}>
          <Ionicons name="share-outline" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}>
        {/* Hero Seller Card */}
        <EnergyCard style={styles.profileHero}>
          <View style={styles.avatarRow}>
            <Image source={{ uri: seller.avatar }} style={styles.heroAvatar} />
            <View style={styles.heroInfoCol}>
              <View style={styles.heroNameRow}>
                <Text style={[styles.heroName, { color: colors.textPrimary }]}>{seller.name}</Text>
                {seller.isVerified && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.textPrimary} style={{ marginLeft: 4 }} />
                )}
              </View>

              <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                {seller.locationName}
              </Text>

              <View style={styles.badgeRow}>
                <View style={[styles.tag, { backgroundColor: colors.secondary, borderColor: colors.surfaceBorder }]}>
                  <Text style={[styles.tagText, { color: colors.textPrimary }]}>{seller.energyType}</Text>
                </View>
                {seller.badge && (
                  <View style={[styles.tag, { backgroundColor: colors.secondary, borderColor: colors.surfaceBorder }]}>
                    <Text style={[styles.tagText, { color: colors.textPrimary }]}>{seller.badge}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <Text style={[styles.bioText, { color: colors.textSecondary }]}>{seller.bio}</Text>
        </EnergyCard>

        {/* Pricing & Surplus Specs */}
        <View style={styles.specsGrid}>
          <EnergyCard style={styles.specCard}>
            <Ionicons name="pricetag-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles.specVal, { color: colors.creditGreen }]}>
              ₹ {seller.pricePerKwh.toFixed(2)}
            </Text>
            <Text style={[styles.specLabel, { color: colors.textMuted }]}>Price per kWh</Text>
          </EnergyCard>

          <EnergyCard style={styles.specCard}>
            <Ionicons name="battery-charging-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles.specVal, { color: colors.textPrimary }]}>
              {seller.availableKwh} <Text style={styles.unitText}>kWh</Text>
            </Text>
            <Text style={[styles.specLabel, { color: colors.textMuted }]}>Available Now</Text>
          </EnergyCard>

          <EnergyCard style={styles.specCard}>
            <Ionicons name="star-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles.specVal, { color: colors.textPrimary }]}>
              {seller.rating.toFixed(1)}
            </Text>
            <Text style={[styles.specLabel, { color: colors.textMuted }]}>
              {seller.reviewCount} Ratings
            </Text>
          </EnergyCard>
        </View>

        {/* Solar System & Smart Meter Hardware Specifications */}
        <EnergyCard style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Hardware & Array Specs</Text>
          
          <View style={styles.specRow}>
            <Ionicons name="hardware-chip-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.specKey, { color: colors.textSecondary }]}>Solar Array Brand:</Text>
            <Text style={[styles.specValue, { color: colors.textPrimary }]}>{seller.panelBrand}</Text>
          </View>

          <View style={styles.specRow}>
            <Ionicons name="flash-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.specKey, { color: colors.textSecondary }]}>Peak Inverter Capacity:</Text>
            <Text style={[styles.specValue, { color: colors.textPrimary }]}>{seller.totalCapacityKw} kW</Text>
          </View>

          <View style={styles.specRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.specKey, { color: colors.textSecondary }]}>Verification Protocol:</Text>
            <Text style={[styles.specValue, { color: colors.textPrimary }]}>Smart Meter OpenADR Verified</Text>
          </View>
        </EnergyCard>

        {/* Peer Reviews Summary */}
        <EnergyCard style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Neighbor Reviews</Text>
          
          <View style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
              <Text style={[styles.reviewerName, { color: colors.textPrimary }]}>Jordan S. (0.6 km)</Text>
              <View style={styles.stars}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Ionicons key={i} name="star" size={12} color={colors.textPrimary} />
                ))}
              </View>
            </View>
            <Text style={[styles.reviewBody, { color: colors.textSecondary }]}>
              "Super reliable morning power feed! Saved ₹85 on my EV charge compared to grid pricing."
            </Text>
          </View>
        </EnergyCard>
      </ScrollView>

      {/* Sticky Bottom Buy CTA Bar */}
      <View style={[styles.stickyBottom, { backgroundColor: colors.surface, borderTopColor: colors.surfaceBorder, paddingBottom: stickyBottomPadding }]}>
        <View>
          <Text style={[styles.bottomPriceLabel, { color: colors.textMuted }]}>Peer Rate</Text>
          <Text style={[styles.bottomPriceVal, { color: colors.creditGreen }]}>
            ₹ {seller.pricePerKwh.toFixed(2)} <Text style={styles.perKwh}>/ kWh</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.buyBtn, { backgroundColor: colors.primary }]}
          onPress={() => setIsBuyModalOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.buyBtnText, { color: colors.primaryForeground }]}>Buy Energy Now</Text>
          <Ionicons name="arrow-forward" size={15} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {/* Buy Modal */}
      <BuyModal
        seller={seller}
        visible={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 6,
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  shareBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  profileHero: {
    padding: 16,
    marginBottom: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  heroAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
  },
  heroInfoCol: {
    flex: 1,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  locationText: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  bioText: {
    fontSize: 12,
    lineHeight: 17,
  },
  specsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  specCard: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    padding: 12,
  },
  specVal: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  unitText: {
    fontSize: 11,
    fontWeight: '500',
  },
  specLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionCard: {
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  specKey: {
    fontSize: 12,
    marginHorizontal: 6,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewItem: {
    marginTop: 4,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 12,
    fontWeight: '700',
  },
  stars: {
    flexDirection: 'row',
  },
  reviewBody: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  bottomPriceLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  bottomPriceVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  perKwh: {
    fontSize: 11,
    fontWeight: '400',
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 6,
  },
});
