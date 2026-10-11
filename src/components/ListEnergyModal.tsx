import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useMarket } from '../context/MarketContext';
import { useAuth } from '../context/AuthContext';

interface ListEnergyModalProps {
  visible: boolean;
  onClose: () => void;
  initialKwh?: number;
  initialPrice?: number;
}

export const ListEnergyModal: React.FC<ListEnergyModalProps> = ({
  visible,
  onClose,
  initialKwh = 20,
  initialPrice = 5.50,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { publishListing, energyBalanceKwh, listedEnergyKwh, sellingRate } = useMarket();

  const defaultQuantity =
    initialKwh !== undefined && initialKwh > 0
      ? Math.min(initialKwh, energyBalanceKwh > 0 ? energyBalanceKwh : initialKwh).toString()
      : energyBalanceKwh > 0
      ? Math.min(10, energyBalanceKwh).toString()
      : '0';

  const [kwhQuantity, setKwhQuantity] = useState<string>(defaultQuantity);
  const [price, setPrice] = useState<string>(
    initialPrice !== undefined && initialPrice > 0
      ? initialPrice.toString()
      : sellingRate > 0
      ? sellingRate.toString()
      : '5.50'
  );
  const [location, setLocation] = useState<string>(user.address || 'Local Microgrid');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (initialKwh !== undefined && initialKwh > 0) {
        setKwhQuantity(
          Math.min(initialKwh, energyBalanceKwh > 0 ? energyBalanceKwh : initialKwh).toString()
        );
      } else if (energyBalanceKwh > 0) {
        setKwhQuantity(Math.min(10, energyBalanceKwh).toString());
      } else {
        setKwhQuantity('0');
      }

      if (initialPrice !== undefined && initialPrice > 0) {
        setPrice(initialPrice.toString());
      } else if (sellingRate > 0) {
        setPrice(sellingRate.toString());
      } else {
        setPrice('5.50');
      }

      setIsSuccess(false);
      setErrorMessage(null);
    }
  }, [visible, energyBalanceKwh, sellingRate, initialKwh, initialPrice]);

  const kwhNum = parseFloat(kwhQuantity) || 0;
  const priceNum = parseFloat(price) || 0;
  const isExceedingBalance = kwhNum > energyBalanceKwh;
  const hasZeroBalance = energyBalanceKwh <= 0;
  const estimatedRevenue = +(kwhNum * priceNum).toFixed(2);
  const gridBenchmark = 8.00;
  const buyerSavingPerKwh = +(gridBenchmark - priceNum).toFixed(2);

  const handlePublish = async () => {
    if (kwhNum <= 0) {
      setErrorMessage('Please enter an energy quantity greater than 0 kWh');
      return;
    }
    if (hasZeroBalance) {
      setErrorMessage('You have 0.0 kWh in your account. You need surplus energy to list on the market.');
      return;
    }
    if (isExceedingBalance) {
      setErrorMessage(
        `Cannot sell ${kwhNum} kWh. Your account only has ${energyBalanceKwh.toFixed(1)} kWh available.`
      );
      return;
    }
    if (priceNum <= 0) {
      setErrorMessage('Please enter a valid price per kWh');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const res = await publishListing({
      availableKwh: kwhNum,
      pricePerKwh: priceNum,
      locationLabel: location.trim() || 'Local Microgrid',
    });

    setIsLoading(false);

    if (res.success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1400);
    } else {
      setErrorMessage(res.message);
    }
  };

  const adjustKwh = (delta: number) => {
    const nextVal = Math.max(1, Math.min(energyBalanceKwh, Math.round(kwhNum + delta)));
    setKwhQuantity(nextVal.toString());
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
          <View style={[styles.grabHandle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {energyBalanceKwh > 0 ? 'Manage Energy Listing' : 'List Energy for Sale'}
              </Text>
              <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                Publish surplus rooftop power to nearby neighbors
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {isSuccess ? (
            <View style={styles.successContainer}>
              <View style={[styles.successIconBox, { backgroundColor: colors.creditGreenBg }]}>
                <Ionicons name="checkmark-circle" size={48} color={colors.creditGreen} />
              </View>
              <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
                Listing Published!
              </Text>
              <Text style={[styles.successSub, { color: colors.textMuted }]}>
                {kwhNum} kWh is now active on the marketplace at ₹{priceNum.toFixed(2)}/kWh.
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollForm}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {errorMessage && (
                <View style={[styles.errorBox, { backgroundColor: colors.debitRedBg }]}>
                  <Ionicons name="alert-circle" size={16} color={colors.debitRed} />
                  <Text style={[styles.errorText, { color: colors.debitRed }]}>{errorMessage}</Text>
                </View>
              )}

              {/* Account Balance Info Card */}
              <View
                style={[
                  styles.accountBalanceCard,
                  {
                    backgroundColor: colors.muted,
                    borderColor: hasZeroBalance ? colors.debitRed : colors.border,
                  },
                ]}
              >
                <View style={styles.accountBalanceLeft}>
                  <Ionicons
                    name="battery-charging"
                    size={20}
                    color={energyBalanceKwh > 0 ? colors.creditGreen : colors.debitRed}
                  />
                  <View>
                    <Text style={[styles.accountBalanceTitle, { color: colors.textPrimary }]}>
                      Available in Account
                    </Text>
                    <Text style={[styles.accountBalanceSub, { color: colors.textMuted }]}>
                      Rooftop surplus energy balance
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.accountBalanceValue,
                    { color: energyBalanceKwh > 0 ? colors.creditGreen : colors.debitRed },
                  ]}
                >
                  {energyBalanceKwh.toFixed(1)} kWh
                </Text>
              </View>

              {/* Energy Quantity Field */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                    Surplus Energy to Sell
                  </Text>
                  <Text style={[styles.fieldHint, { color: colors.textMuted }]}>
                    Meter #{user.meterId || 'MTR-8821'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: colors.muted,
                      borderColor: isExceedingBalance ? colors.debitRed : colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.numericInput, { color: colors.textPrimary }]}
                    keyboardType="decimal-pad"
                    value={kwhQuantity}
                    onChangeText={setKwhQuantity}
                    placeholder={energyBalanceKwh > 0 ? Math.min(10, energyBalanceKwh).toString() : '0'}
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.unitText, { color: colors.textMuted }]}>kWh</Text>
                </View>

                {isExceedingBalance && (
                  <View style={styles.inlineWarning}>
                    <Ionicons name="alert-circle" size={13} color={colors.debitRed} />
                    <Text style={[styles.inlineWarningText, { color: colors.debitRed }]}>
                      Exceeds account balance ({energyBalanceKwh.toFixed(1)} kWh max)
                    </Text>
                  </View>
                )}

                {hasZeroBalance && (
                  <View style={styles.inlineWarning}>
                    <Ionicons name="alert-circle" size={13} color={colors.debitRed} />
                    <Text style={[styles.inlineWarningText, { color: colors.debitRed }]}>
                      No surplus energy recorded in your account
                    </Text>
                  </View>
                )}

                {/* Quick Add Chips */}
                <View style={styles.chipsRow}>
                  {[5, 10, 20]
                    .filter((amount) => amount < energyBalanceKwh)
                    .map((amount) => (
                      <TouchableOpacity
                        key={amount}
                        style={[styles.chip, { backgroundColor: colors.muted }]}
                        onPress={() => setKwhQuantity(amount.toString())}
                      >
                        <Text style={[styles.chipText, { color: colors.textPrimary }]}>
                          {amount} kWh
                        </Text>
                      </TouchableOpacity>
                    ))}
                  {energyBalanceKwh > 0 && (
                    <TouchableOpacity
                      style={[
                        styles.chip,
                        {
                          backgroundColor: '#ECFDF5',
                          borderColor: '#10B981',
                          borderWidth: 1,
                        },
                      ]}
                      onPress={() => setKwhQuantity(energyBalanceKwh.toString())}
                    >
                      <Text style={[styles.chipText, { color: '#10B981', fontWeight: '700' }]}>
                        Max ({energyBalanceKwh.toFixed(1)} kWh)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Price Per kWh Field */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                    Your Selling Rate
                  </Text>
                  <Text style={[styles.fieldHint, { color: colors.creditGreen }]}>
                    Grid benchmark: ₹8.00 / kWh
                  </Text>
                </View>

                <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[styles.currencyPrefix, { color: colors.textPrimary }]}>₹</Text>
                  <TextInput
                    style={[styles.numericInput, { color: colors.textPrimary }]}
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={setPrice}
                    placeholder="5.50"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.unitText, { color: colors.textMuted }]}>/ kWh</Text>
                </View>

                {buyerSavingPerKwh > 0 && (
                  <Text style={[styles.rateTip, { color: colors.creditGreen }]}>
                    ⚡ Buyers save ₹{buyerSavingPerKwh.toFixed(2)}/kWh compared to state grid rate
                  </Text>
                )}
              </View>

              {/* Location / Microgrid Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                  Microgrid Neighborhood
                </Text>
                <View style={[styles.inputBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Ionicons name="location-outline" size={16} color={colors.textMuted} style={styles.locIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="e.g. Indiranagar 100ft Rd"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* Revenue Projection Card */}
              <View style={[styles.summaryCard, { backgroundColor: colors.muted }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Potential Revenue</Text>
                  <Text style={[styles.summaryValue, { color: colors.creditGreen }]}>
                    ₹ {estimatedRevenue.toFixed(2)}
                  </Text>
                </View>
                <Text style={[styles.summaryNote, { color: colors.textMuted }]}>
                  Full payout credited to your virtual wallet automatically upon order completion.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btnOutline, { borderColor: colors.border }]}
                  onPress={onClose}
                  disabled={isLoading}
                >
                  <Text style={[styles.btnOutlineText, { color: colors.textPrimary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.btnPrimary,
                    {
                      backgroundColor:
                        isExceedingBalance || hasZeroBalance || kwhNum <= 0
                          ? colors.muted
                          : colors.primary,
                    },
                  ]}
                  onPress={handlePublish}
                  disabled={isLoading || isExceedingBalance || hasZeroBalance || kwhNum <= 0}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Text
                      style={[
                        styles.btnPrimaryText,
                        {
                          color:
                            isExceedingBalance || hasZeroBalance || kwhNum <= 0
                              ? colors.textMuted
                              : colors.primaryForeground,
                        },
                      ]}
                    >
                      {listedEnergyKwh > 0 ? 'Update Listing' : 'Publish to Market'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 18,
    paddingBottom: 28,
    maxHeight: '90%',
  },
  grabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  modalSub: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollForm: {
    gap: 14,
    paddingBottom: 10,
  },
  accountBalanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  accountBalanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountBalanceTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  accountBalanceSub: {
    fontSize: 10,
    marginTop: 1,
  },
  accountBalanceValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  inlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  inlineWarningText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  fieldGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  fieldHint: {
    fontSize: 10,
    fontWeight: '500',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  numericInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 0,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 6,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  locIcon: {
    marginRight: 8,
  },
  rateTip: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryNote: {
    fontSize: 9.5,
    lineHeight: 13,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  btnOutline: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  btnPrimary: {
    flex: 2,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  successIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  successSub: {
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 240,
  },
});
