import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { UserRole } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useMarket } from '../context/MarketContext';
import { ListEnergyModal } from '../components/ListEnergyModal';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const {
    walletBalance,
    energyBalanceKwh,
    listedEnergyKwh,
    sellingRate,
    setSellingRate,
    transactions,
    isRefreshing,
    refreshMarketplace,
    alertBanner,
    dismissAlertBanner,
    updateSellerRate,
  } = useMarket();

  const [activeRole, setActiveRole] = useState<UserRole>(user.role || 'Both');
  const [isEditRateModalOpen, setIsEditRateModalOpen] = useState<boolean>(false);
  const [isListModalOpen, setIsListModalOpen] = useState<boolean>(false);
  const [tempRate, setTempRate] = useState<string>(sellingRate.toFixed(2));

  const handleSaveRate = async () => {
    const rateNum = parseFloat(tempRate);
    if (!isNaN(rateNum) && rateNum > 0) {
      await updateSellerRate(rateNum);
      setIsEditRateModalOpen(false);
      Alert.alert('Rate Updated', `Your solar selling rate is now ₹${rateNum.toFixed(2)}/kWh`);
    } else {
      Alert.alert('Invalid Rate', 'Please enter a valid price in ₹ per kWh');
    }
  };

  const todayRevenue = transactions
    .filter((t) => t.type === 'Sell')
    .reduce((acc, t) => acc + t.totalAmount, 0);
  const sellOrdersCount = transactions.filter((t) => t.type === 'Sell').length;

  const totalPurchasedKwh = transactions
    .filter((t) => t.type === 'Buy')
    .reduce((acc, t) => acc + t.kwhAmount, 0);
  const totalSpent = transactions
    .filter((t) => t.type === 'Buy')
    .reduce((acc, t) => acc + t.totalAmount, 0);
  const gridSavings = Math.max(0, +(totalPurchasedKwh * 8.00 - totalSpent).toFixed(2));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refreshMarketplace} tintColor={colors.textPrimary} />
        }
      >
        {/* Top Header matching Figma Screen 02 & 03 */}
        <View style={styles.topHeader}>
          <View>
            <Text style={[styles.helloText, { color: colors.textMuted }]}>
              Hello, {user.name || 'Prosumer'}
            </Text>
            <View style={styles.meterRow}>
              <Text style={[styles.meterTitle, { color: colors.textPrimary }]}>
                {activeRole === 'Buyer'
                  ? 'Consumer Portal'
                  : user.meterId
                  ? `#${user.meterId}`
                  : 'Meter Pending'}
              </Text>
              <View
                style={[
                  styles.appBadge,
                  user.isMeterConnected ? styles.badgeGreen : styles.badgeMuted,
                ]}
              >
                <Text
                  style={user.isMeterConnected ? styles.badgeGreenText : styles.badgeMutedText}
                >
                  {user.isMeterConnected ? 'Active' : 'Unpaired'}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.appBadge, styles.badgeMuted]}>
            <Text style={[styles.badgeMutedText, { color: colors.textSecondary }]}>
              {activeRole === 'Both' ? 'Prosumer' : activeRole}
            </Text>
          </View>
        </View>

        {/* Banner Notification from Figma */}
        {alertBanner && (
          <TouchableOpacity
            style={[styles.bannerNotification, { backgroundColor: colors.creditGreenBg }]}
            onPress={dismissAlertBanner}
            activeOpacity={0.8}
          >
            <View style={styles.bannerLeft}>
              <Ionicons name="flash" size={14} color={colors.creditGreen} />
              <Text style={[styles.bannerText, { color: colors.textPrimary }]}>{alertBanner}</Text>
            </View>
            <Ionicons name="close" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Segmented Role Switcher: Buyer | Seller | Both */}
        <View style={[styles.segmented, { backgroundColor: colors.muted }]}>
          {(['Buyer', 'Seller', 'Both'] as UserRole[]).map((role) => {
            const isActive = activeRole === role;
            return (
              <TouchableOpacity
                key={role}
                style={[
                  styles.segmentedItem,
                  isActive && [styles.segmentedItemActive, { backgroundColor: colors.card }],
                ]}
                onPress={() => setActiveRole(role)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentedItemText,
                    {
                      color: isActive ? colors.textPrimary : colors.textMuted,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {role}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ===================== SELLER VIEW ===================== */}
        {(activeRole === 'Seller' || activeRole === 'Both') && (
          <View style={styles.sectionStack}>
            {activeRole === 'Both' && (
              <Text style={[styles.subSectionTitle, { color: colors.textMuted }]}>SELLER DASHBOARD</Text>
            )}

            {/* Energy for Sale Card (Figma Screen 02) */}
            <View style={[styles.appCard, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Energy for Sale</Text>
                <TouchableOpacity onPress={() => setIsListModalOpen(true)}>
                  <Text style={[styles.linkAction, { color: colors.primary }]}>
                    {listedEnergyKwh > 0 ? 'Manage Listing' : '+ List Energy'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardBottomRow}>
                <View>
                  <Text style={[styles.heroMetric, { color: colors.textPrimary }]}>
                    {listedEnergyKwh.toFixed(1)} kWh
                  </Text>
                  <Text style={[styles.heroMetricSub, { color: colors.textMuted }]}>
                    {listedEnergyKwh > 0 ? 'Surplus rooftop power live on market' : 'No surplus energy listed on market'}
                  </Text>
                </View>

                <View style={styles.rightRateCol}>
                  <Text style={[styles.rateHighlight, { color: colors.creditGreen }]}>
                    ₹ {sellingRate.toFixed(2)} / kWh
                  </Text>
                  <Text style={[styles.rateTariffSub, { color: colors.textMuted }]}>
                    Grid Tariff: ₹ 8.00
                  </Text>
                </View>
              </View>

              {listedEnergyKwh === 0 && (
                <TouchableOpacity
                  style={[styles.btnPrimary, { backgroundColor: colors.primary, marginTop: 12 }]}
                  onPress={() => setIsListModalOpen(true)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.btnPrimaryText, { color: colors.primaryForeground }]}>
                    + Publish Energy to Marketplace
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Two Metric Cards: Available Surplus & Today's Revenue */}
            <View style={styles.twoColGrid}>
              <View style={[styles.appCard, styles.colCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.colCardLabel, { color: colors.textMuted }]}>Available Surplus</Text>
                <Text style={[styles.colCardVal, { color: colors.textPrimary }]}>
                  {energyBalanceKwh.toFixed(1)} kWh
                </Text>
                <Text
                  style={[
                    styles.colCardSub,
                    { color: energyBalanceKwh > 0 ? colors.creditGreen : colors.textMuted },
                  ]}
                >
                  {energyBalanceKwh > 0 ? 'Account surplus ready' : 'No surplus in account'}
                </Text>
              </View>

              <View style={[styles.appCard, styles.colCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.colCardLabel, { color: colors.textMuted }]}>Today's Revenue</Text>
                <Text style={[styles.colCardVal, { color: colors.creditGreen }]}>
                  ₹ {todayRevenue.toFixed(2)}
                </Text>
                <Text style={[styles.colCardSub, { color: colors.textMuted }]}>
                  {sellOrdersCount} {sellOrdersCount === 1 ? 'order' : 'orders'} settled
                </Text>
              </View>
            </View>

            {/* 24h Live Generation Curve (Figma Screen 02) */}
            <View style={[styles.appCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                24h Live Generation Curve
              </Text>

              {/* 5 Vertical Bar Visualizer from Figma */}
              <View style={styles.barsContainer}>
                <View
                  style={[
                    styles.barColumn,
                    {
                      height: energyBalanceKwh > 0 ? 16 : 8,
                      backgroundColor: colors.muted,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.barColumn,
                    {
                      height: energyBalanceKwh > 0 ? 26 : 8,
                      backgroundColor: colors.muted,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.barColumn,
                    {
                      height: energyBalanceKwh > 0 ? 48 : 8,
                      backgroundColor: energyBalanceKwh > 0 ? colors.solarGold : colors.muted,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.barColumn,
                    {
                      height: energyBalanceKwh > 0 ? 36 : 8,
                      backgroundColor: colors.muted,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.barColumn,
                    {
                      height: energyBalanceKwh > 0 ? 16 : 8,
                      backgroundColor: colors.muted,
                    },
                  ]}
                />
              </View>

              <View style={styles.chartTimeRow}>
                <Text style={[styles.chartTimeText, { color: colors.textMuted }]}>06:00</Text>
                <Text
                  style={[
                    styles.chartTimePeak,
                    { color: energyBalanceKwh > 0 ? colors.solarGold : colors.textMuted },
                  ]}
                >
                  {energyBalanceKwh > 0 ? '12:00 Peak' : '12:00'}
                </Text>
                <Text style={[styles.chartTimeText, { color: colors.textMuted }]}>18:00</Text>
              </View>
            </View>
          </View>
        )}

        {/* ===================== BUYER VIEW ===================== */}
        {(activeRole === 'Buyer' || activeRole === 'Both') && (
          <View style={[styles.sectionStack, activeRole === 'Both' && { marginTop: 8 }]}>
            {activeRole === 'Both' && (
              <Text style={[styles.subSectionTitle, { color: colors.textMuted }]}>BUYER DASHBOARD</Text>
            )}

            {/* Household Current Load Card (Figma Screen 03) */}
            <View style={[styles.appCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.colCardLabel, { color: colors.textMuted }]}>
                Household Current Load
              </Text>
              <Text style={[styles.heroMetric, { marginVertical: 4, color: colors.textPrimary }]}>
                0.0 kW
              </Text>
              <Text style={[styles.heroMetricSub, { marginBottom: 12, color: colors.textMuted }]}>
                Smart meter standby draw
              </Text>

              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('MarketplaceTab')}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnPrimaryText, { color: colors.primaryForeground }]}>
                  Find Nearby Energy
                </Text>
              </TouchableOpacity>
            </View>

            {/* Two Metric Cards: Wallet Balance & Grid Savings */}
            <View style={styles.twoColGrid}>
              <View style={[styles.appCard, styles.colCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.colCardLabel, { color: colors.textMuted }]}>Wallet Balance</Text>
                <Text style={[styles.colCardVal, { color: colors.textPrimary }]}>
                  ₹ {walletBalance.toFixed(2)}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('WalletTab')}>
                  <Text style={[styles.colCardAction, { color: colors.primary }]}>Add Money</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.appCard, styles.colCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.colCardLabel, { color: colors.textMuted }]}>Grid Savings</Text>
                <Text style={[styles.colCardVal, { color: colors.creditGreen }]}>
                  ₹ {gridSavings.toFixed(2)}
                </Text>
                <Text style={[styles.colCardSub, { color: colors.textMuted }]}>Saved vs State Grid</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Edit Rate Modal */}
      <Modal visible={isEditRateModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Set Energy Rate</Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>
              Define your price per kWh for surplus rooftop solar electricity.
            </Text>

            <View style={[styles.inputBox, { backgroundColor: colors.muted }]}>
              <Text style={[styles.inputPrefix, { color: colors.textPrimary }]}>₹</Text>
              <TextInput
                style={[styles.inputField, { color: colors.textPrimary }]}
                keyboardType="numeric"
                value={tempRate}
                onChangeText={setTempRate}
                placeholder="5.50"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.inputSuffix, { color: colors.textMuted }]}>/ kWh</Text>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                onPress={() => setIsEditRateModalOpen(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveRate}
              >
                <Text style={[styles.modalBtnText, { color: colors.primaryForeground }]}>Save Rate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* List Energy Modal */}
      <ListEnergyModal visible={isListModalOpen} onClose={() => setIsListModalOpen(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    gap: 12,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  helloText: {
    fontSize: 11,
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  meterTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  appBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeGreen: {
    backgroundColor: '#ECFDF5',
  },
  badgeGreenText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '600',
  },
  badgeMuted: {
    backgroundColor: '#F4F4F5',
  },
  badgeMutedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  bannerNotification: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  bannerText: {
    fontSize: 11,
    fontWeight: '500',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
  },
  segmentedItem: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentedItemActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  segmentedItemText: {
    fontSize: 11,
  },
  sectionStack: {
    gap: 10,
  },
  subSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  appCard: {
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  linkAction: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroMetric: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  heroMetricSub: {
    fontSize: 10,
    marginTop: 2,
  },
  rightRateCol: {
    alignItems: 'flex-end',
  },
  rateHighlight: {
    fontSize: 15,
    fontWeight: '700',
  },
  rateTariffSub: {
    fontSize: 9,
    marginTop: 2,
  },
  twoColGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  colCard: {
    flex: 1,
  },
  colCardLabel: {
    fontSize: 10,
  },
  colCardVal: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  colCardSub: {
    fontSize: 9,
    marginTop: 2,
  },
  colCardAction: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 50,
  },
  barColumn: {
    flex: 1,
    borderRadius: 3,
  },
  chartTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  chartTimeText: {
    fontSize: 9,
  },
  chartTimePeak: {
    fontSize: 9,
    fontWeight: '600',
  },
  btnPrimary: {
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 14,
    padding: 18,
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 6,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  inputSuffix: {
    fontSize: 12,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
