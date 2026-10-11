import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Seller } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { useMarket } from '../context/MarketContext';

interface BuyModalProps {
  seller: Seller | null;
  visible: boolean;
  onClose: () => void;
  onViewWallet?: () => void;
}

export const BuyModal: React.FC<BuyModalProps> = ({
  seller,
  visible,
  onClose,
  onViewWallet,
}) => {
  const { colors } = useTheme();
  const { walletBalance, buyEnergy } = useMarket();

  const [kwhQuantity, setKwhQuantity] = useState<string>('10');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [lastTxId, setLastTxId] = useState<string>('TXN-9948210');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!seller) return null;

  const kwhNum = parseFloat(kwhQuantity) || 0;
  const transitFee = 2.00;
  const energyCost = +(kwhNum * seller.pricePerKwh).toFixed(2);
  const totalCost = +(energyCost + (kwhNum > 0 ? transitFee : 0)).toFixed(2);
  const isSufficient = walletBalance >= totalCost;

  const handleConfirmPurchase = async () => {
    if (kwhNum <= 0) {
      setErrorMessage('Please enter a valid kWh quantity');
      return;
    }
    if (kwhNum > seller.availableKwh) {
      setErrorMessage(`Seller only has ${seller.availableKwh} kWh available`);
      return;
    }
    if (!isSufficient) {
      setErrorMessage(`Insufficient wallet balance. You need ₹${totalCost.toFixed(2)}`);
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    const result = await buyEnergy(seller, kwhNum);
    setIsLoading(false);

    if (result.success) {
      setLastTxId(result.tx?.id || `TXN-${Math.floor(1000000 + Math.random() * 9000000)}`);
      setIsSuccess(true);
    } else {
      setErrorMessage(result.message);
    }
  };

  const handleModalClose = () => {
    setIsSuccess(false);
    setErrorMessage(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleModalClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheetOverlay, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Grab handle from Figma */}
          <View style={[styles.grabHandle, { backgroundColor: colors.border }]} />

          {!isSuccess ? (
            /* ================= BUY SHEET (FIGMA SCREEN 05) ================= */
            <View style={styles.sheetBody}>
              <View style={styles.sheetHeader}>
                <View style={styles.titleRow}>
                  <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                    Purchase Green Energy
                  </Text>
                  <Text style={[styles.rateTag, { color: colors.creditGreen }]}>
                    ₹ {seller.pricePerKwh.toFixed(2)} / kWh
                  </Text>
                </View>
                <Text style={[styles.sellerSub, { color: colors.textMuted }]}>
                  Seller: {seller.name} ({seller.distanceKm} km)
                </Text>
              </View>

              {/* Quantity Input Box matching Figma Screen 05 */}
              <View style={[styles.appCard, styles.quantityCard, { backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.quantityInput, { color: colors.textPrimary }]}
                  keyboardType="numeric"
                  value={kwhQuantity}
                  onChangeText={(val) => {
                    setKwhQuantity(val);
                    setErrorMessage(null);
                  }}
                  placeholder="10"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={[styles.maxSuffix, { color: colors.textMuted }]}>
                  kWh (Max {seller.availableKwh})
                </Text>
              </View>

              {/* Cost Calculation Breakdown Card matching Figma Screen 05 */}
              <View style={[styles.appCard, styles.breakdownCard, { backgroundColor: colors.muted }]}>
                <View style={styles.breakdownLine}>
                  <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>
                    {kwhNum} kWh × ₹{seller.pricePerKwh.toFixed(2)}
                  </Text>
                  <Text style={[styles.breakdownVal, { color: colors.textPrimary }]}>
                    ₹ {energyCost.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.breakdownLine}>
                  <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>
                    Transit fee
                  </Text>
                  <Text style={[styles.breakdownVal, { color: colors.textPrimary }]}>
                    ₹ {transitFee.toFixed(2)}
                  </Text>
                </View>

                <View style={[styles.calcDivider, { backgroundColor: colors.border }]} />

                <View style={[styles.breakdownLine, { marginTop: 2 }]}>
                  <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>
                    Total Cost
                  </Text>
                  <Text style={[styles.totalVal, { color: colors.creditGreen }]}>
                    ₹ {totalCost.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Wallet Sufficiency Badge from Figma */}
              <View style={styles.balanceStatusRow}>
                <Text
                  style={[
                    styles.balanceStatusText,
                    { color: isSufficient ? colors.creditGreen : colors.debitRed },
                  ]}
                >
                  {isSufficient
                    ? `Wallet: ₹ ${walletBalance.toFixed(2)} (Sufficient)`
                    : `Wallet: ₹ ${walletBalance.toFixed(2)} (Insufficient)`}
                </Text>
              </View>

              {errorMessage && (
                <Text style={[styles.errorAlert, { color: colors.debitRed }]}>{errorMessage}</Text>
              )}

              {/* Confirm Button from Figma */}
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  { backgroundColor: colors.primary, opacity: !isSufficient || kwhNum <= 0 ? 0.6 : 1 },
                ]}
                onPress={handleConfirmPurchase}
                disabled={isLoading || !isSufficient || kwhNum <= 0}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <Text style={[styles.btnPrimaryText, { color: colors.primaryForeground }]}>
                    Confirm & Transfer ₹ {totalCost.toFixed(2)}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* ================= TRANSACTION SUCCESS CONFIRMATION ================= */
            <View style={styles.successBody}>
              <View style={[styles.successIconCircle, { backgroundColor: colors.creditGreenBg }]}>
                <Ionicons name="checkmark" size={36} color={colors.creditGreen} />
              </View>

              <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
                Transaction Successful!
              </Text>
              <Text style={[styles.successSub, { color: colors.textMuted }]}>
                {kwhNum} kWh rooftop clean energy has been transferred to your meter.
              </Text>

              {/* Receipt Breakdown Card */}
              <View style={[styles.appCard, styles.receiptCard, { backgroundColor: colors.muted }]}>
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: colors.textMuted }]}>Total Debited</Text>
                  <Text style={[styles.receiptValBold, { color: colors.textPrimary }]}>
                    ₹ {totalCost.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: colors.textMuted }]}>Energy Received</Text>
                  <Text style={[styles.receiptVal, { color: colors.textPrimary }]}>{kwhNum} kWh</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: colors.textMuted }]}>Seller</Text>
                  <Text style={[styles.receiptVal, { color: colors.textPrimary }]}>{seller.name}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: colors.textMuted }]}>Order Ref</Text>
                  <Text style={[styles.receiptVal, { color: colors.textMuted }]}>#{lastTxId}</Text>
                </View>
              </View>

              <View style={styles.successBtnStack}>
                <TouchableOpacity
                  style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    handleModalClose();
                    if (onViewWallet) onViewWallet();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.btnPrimaryText, { color: colors.primaryForeground }]}>
                    View in Wallet
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnOutline, { borderColor: colors.border }]}
                  onPress={handleModalClose}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.btnOutlineText, { color: colors.textPrimary }]}>
                    Back to Marketplace
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetOverlay: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: 16,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 8,
  },
  grabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetBody: {
    gap: 10,
  },
  sheetHeader: {
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  rateTag: {
    fontSize: 13,
    fontWeight: '700',
  },
  sellerSub: {
    fontSize: 10,
    marginTop: 2,
  },
  appCard: {
    borderRadius: 12,
    padding: 10,
  },
  quantityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  quantityInput: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    padding: 0,
  },
  maxSuffix: {
    fontSize: 11,
  },
  breakdownCard: {
    gap: 4,
  },
  breakdownLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 11,
  },
  breakdownVal: {
    fontSize: 11,
    fontWeight: '600',
  },
  calcDivider: {
    height: 1,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  totalVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  balanceStatusRow: {
    marginVertical: 2,
  },
  balanceStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  errorAlert: {
    fontSize: 11,
  },
  btnPrimary: {
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  successBody: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  successSub: {
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 16,
  },
  receiptCard: {
    width: '100%',
    gap: 6,
    padding: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 11,
  },
  receiptVal: {
    fontSize: 11,
    fontWeight: '500',
  },
  receiptValBold: {
    fontSize: 13,
    fontWeight: '700',
  },
  successBtnStack: {
    width: '100%',
    gap: 8,
    marginTop: 4,
  },
  btnOutline: {
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
