import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Seller } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { EnergyCard } from './EnergyCard';

interface MapViewMockProps {
  sellers: Seller[];
  onSelectSeller: (seller: Seller) => void;
  onBuyPress: (seller: Seller) => void;
}

export const MapViewMock: React.FC<MapViewMockProps> = ({ sellers, onSelectSeller, onBuyPress }) => {
  const { colors } = useTheme();
  const [activePin, setActivePin] = useState<Seller | null>(sellers[0] || null);
  const containerWidth = Dimensions.get('window').width - 32;

  return (
    <View style={[styles.mapContainer, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      {/* Radar Map Grid Background */}
      <View style={styles.gridOverlay}>
        <View style={[styles.radarRing1, { borderColor: colors.surfaceBorder }]} />
        <View style={[styles.radarRing2, { borderColor: colors.surfaceBorder }]} />
        <View style={[styles.radarRing3, { borderColor: colors.surfaceBorder }]} />
        
        {/* User Location Center */}
        <View style={[styles.userPulse, { backgroundColor: colors.secondary, borderColor: colors.surfaceBorder }]}>
          <View style={[styles.userDot, { backgroundColor: colors.textPrimary }]} />
        </View>
        <Text style={[styles.userTag, { color: colors.textPrimary }]}>Smart Meter Hub</Text>
      </View>

      {/* Seller Map Pins */}
      <View style={styles.pinLayer}>
        {sellers.map((seller, index) => {
          const isSelected = activePin?.id === seller.id;

          const angles = [45, 120, 200, 290, 340, 90, 160, 230, 310, 15];
          const angle = (angles[index % angles.length] * Math.PI) / 180;
          const radius = 50 + (seller.distanceKm * 22);

          const left = containerWidth / 2 + radius * Math.cos(angle) - 24;
          const top = 160 + radius * Math.sin(angle) - 24;

          return (
            <TouchableOpacity
              key={seller.id}
              style={[
                styles.pinWrapper,
                { left, top },
                isSelected && { zIndex: 10 },
              ]}
              onPress={() => setActivePin(seller)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.pinBubble,
                  { backgroundColor: isSelected ? colors.primary : colors.card },
                  { borderColor: isSelected ? colors.primary : colors.surfaceBorder },
                ]}
              >
                <Ionicons
                  name="flash-outline"
                  size={11}
                  color={isSelected ? colors.primaryForeground : colors.textPrimary}
                />
                <Text
                  style={[
                    styles.pinPrice,
                    { color: isSelected ? colors.primaryForeground : colors.textPrimary },
                  ]}
                >
                  ${seller.pricePerKwh.toFixed(2)}
                </Text>
              </View>
              <View
                style={[
                  styles.pinPointer,
                  { borderTopColor: isSelected ? colors.primary : colors.card },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Seller Floating Callout Card */}
      {activePin && (
        <View style={styles.calloutPositioner}>
          <EnergyCard style={styles.calloutCard}>
            <View style={styles.calloutHeader}>
              <Image source={{ uri: activePin.avatar }} style={styles.calloutAvatar} />
              <View style={styles.calloutTextCol}>
                <View style={styles.calloutTitleRow}>
                  <Text style={[styles.calloutName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {activePin.name}
                  </Text>
                  {activePin.isVerified && (
                    <Ionicons name="checkmark-circle" size={13} color={colors.textPrimary} style={{ marginLeft: 4 }} />
                  )}
                </View>
                <Text style={[styles.calloutSub, { color: colors.textSecondary }]}>
                  {activePin.distanceKm} km away • {activePin.availableKwh} kWh available
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setActivePin(null)}
              >
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.calloutFooter}>
              <View>
                <Text style={[styles.calloutPriceLabel, { color: colors.textMuted }]}>Peer Rate</Text>
                <Text style={[styles.calloutPriceVal, { color: colors.textPrimary }]}>
                  ${activePin.pricePerKwh.toFixed(2)} <Text style={styles.unitSmall}>/ kWh</Text>
                </Text>
              </View>

              <View style={styles.btnGroup}>
                <TouchableOpacity
                  style={[styles.detailsBtn, { borderColor: colors.surfaceBorder }]}
                  onPress={() => onSelectSeller(activePin)}
                >
                  <Text style={[styles.detailsBtnText, { color: colors.textPrimary }]}>Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.buyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => onBuyPress(activePin)}
                >
                  <Text style={[styles.buyBtnText, { color: colors.primaryForeground }]}>Buy Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </EnergyCard>
        </View>
      )}

      {/* Map Control Overlay */}
      <View style={[styles.locationBadge, { backgroundColor: colors.secondary, borderColor: colors.surfaceBorder }]}>
        <Ionicons name="compass-outline" size={13} color={colors.textPrimary} />
        <Text style={[styles.locationBadgeText, { color: colors.textPrimary }]}>
          10 Clean Energy Suppliers near Palo Alto CA
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    height: 380,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  gridOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarRing1: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    position: 'absolute',
  },
  radarRing2: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    position: 'absolute',
  },
  radarRing3: {
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1,
    borderStyle: 'dashed',
    position: 'absolute',
  },
  userPulse: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  userTag: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pinLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  pinWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  pinBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
  },
  pinPrice: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
  },
  pinPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  calloutPositioner: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  calloutCard: {
    padding: 12,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  calloutAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  calloutTextCol: {
    flex: 1,
  },
  calloutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calloutName: {
    fontSize: 13,
    fontWeight: '700',
  },
  calloutSub: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  calloutFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
    paddingTop: 8,
  },
  calloutPriceLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
  },
  calloutPriceVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  unitSmall: {
    fontSize: 10,
    fontWeight: '400',
  },
  btnGroup: {
    flexDirection: 'row',
  },
  detailsBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 6,
  },
  detailsBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  buyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  buyBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  locationBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
});
