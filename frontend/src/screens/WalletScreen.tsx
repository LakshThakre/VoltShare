import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useMarket } from '../context/MarketContext';

export const WalletScreen: React.FC = () => {
  const { colors } = useTheme();
  const {
    walletBalance,
    energyBalanceKwh,
    transactions,
    isRefreshing,
    refreshMarketplace,
    addFunds,
    withdrawFunds,
  } = useMarket();

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState<boolean>(false);
  const [addAmount, setAddAmount] = useState<string>('500');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('400');
  const [withdrawDestination, setWithdrawDestination] = useState<string>('UPI: laksh@okaxis');

  const handleConfirmAdd = async () => {
    const num = parseFloat(addAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount in ₹.');
      return;
    }
    await addFunds(num);
    setIsAddModalOpen(false);
    Alert.alert('Balance Added', `₹${num.toFixed(2)} added to your virtual wallet.`);
  };

  const handleConfirmWithdraw = async () => {
    const num = parseFloat(withdrawAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    const res = await withdrawFunds(num, withdrawDestination);
    if (res.success) {
      setIsWithdrawModalOpen(false);
      Alert.alert('Withdrawal Submitted', res.message);
    } else {
      Alert.alert('Withdrawal Failed', res.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header matching Figma Screen 06 */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Energy Wallet</Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refreshMarketplace} tintColor={colors.textPrimary} />
        }
        ListHeaderComponent={
          <>
            {/* Prominent Dark Balance Card matching Figma Screen 06 */}
            <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text style={[styles.balanceLabel, { color: colors.primaryForeground }]}>
                    Available Balance
                  </Text>
                  <Text style={[styles.balanceVal, { color: colors.primaryForeground }]}>
                    ₹ {walletBalance.toFixed(2)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.balanceLabel, { color: colors.primaryForeground, opacity: 0.8 }]}>
                    Energy in Account
                  </Text>
                  <Text style={[styles.balanceVal, { color: colors.creditGreen, fontSize: 20 }]}>
                    {energyBalanceKwh.toFixed(1)} kWh
                  </Text>
                </View>
              </View>

              {/* Two buttons row matching Figma */}
              <View style={styles.cardBtnRow}>
                <TouchableOpacity
                  style={[styles.cardBtn, { backgroundColor: colors.card }]}
                  onPress={() => setIsAddModalOpen(true)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.cardBtnText, { color: colors.textPrimary }]}>
                    Add Balance
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cardBtn, { backgroundColor: colors.muted }]}
                  onPress={() => setIsWithdrawModalOpen(true)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.cardBtnText, { color: colors.textPrimary }]}>
                    Withdraw
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section Header */}
            <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>
              Transaction History
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No transactions recorded yet.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCredit = item.type === 'Sell' || item.type === 'Deposit';
          const title =
            item.type === 'Sell' && !item.sellerOrBuyerName.toLowerCase().startsWith('sold')
              ? `Sold ${item.kwhAmount} kWh to ${item.sellerOrBuyerName}`
              : item.type === 'Buy' && !item.sellerOrBuyerName.toLowerCase().startsWith('purchased')
              ? `Purchased ${item.kwhAmount} kWh from ${item.sellerOrBuyerName}`
              : item.sellerOrBuyerName;

          return (
            /* Transaction Card matching Figma Screen 06 */
            <View style={[styles.appCard, { backgroundColor: colors.card }]}>
              <View style={styles.txInfoCol}>
                <Text style={[styles.txTitle, { color: colors.textPrimary }]}>{title}</Text>
                <Text style={[styles.txTime, { color: colors.textMuted }]}>{item.timestamp}</Text>
              </View>

              <Text
                style={[
                  styles.txAmount,
                  { color: isCredit ? colors.creditGreen : colors.debitRed },
                ]}
              >
                {isCredit ? '+ ' : '- '}₹ {item.totalAmount.toFixed(2)}
              </Text>
            </View>
          );
        }}
      />

      {/* Add Balance Modal */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.grabHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add Balance</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.amountInputRow, { backgroundColor: colors.muted }]}>
              <Text style={[styles.amountPrefix, { color: colors.textPrimary }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.textPrimary }]}
                keyboardType="numeric"
                value={addAmount}
                onChangeText={setAddAmount}
                placeholder="500"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Quick Chips */}
            <View style={styles.quickChipsRow}>
              {['200', '500', '1000', '2000'].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor: addAmount === val ? colors.primary : colors.muted,
                    },
                  ]}
                  onPress={() => setAddAmount(val)}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      { color: addAmount === val ? colors.primaryForeground : colors.textPrimary },
                    ]}
                  >
                    +₹{val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={handleConfirmAdd}
            >
              <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
                Add ₹ {parseFloat(addAmount || '0').toFixed(2)} via UPI
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Withdraw Modal */}
      <Modal visible={isWithdrawModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.grabHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Withdraw Funds</Text>
              <TouchableOpacity onPress={() => setIsWithdrawModalOpen(false)}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.amountInputRow, { backgroundColor: colors.muted }]}>
              <Text style={[styles.amountPrefix, { color: colors.textPrimary }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.textPrimary }]}
                keyboardType="numeric"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                placeholder="400"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <TextInput
              style={[styles.destInput, { backgroundColor: colors.muted, color: colors.textPrimary }]}
              value={withdrawDestination}
              onChangeText={setWithdrawDestination}
              placeholder="UPI ID or Bank Account"
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={handleConfirmWithdraw}
            >
              <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
                Withdraw ₹ {parseFloat(withdrawAmount || '0').toFixed(2)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 8,
  },
  balanceCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 6,
  },
  balanceLabel: {
    fontSize: 11,
    opacity: 0.8,
  },
  balanceVal: {
    fontSize: 28,
    fontWeight: '700',
    marginVertical: 4,
    letterSpacing: -0.5,
  },
  cardBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  cardBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 2,
  },
  appCard: {
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  txInfoCol: {
    gap: 2,
  },
  txTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  txTime: {
    fontSize: 9,
  },
  txAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 32,
    gap: 12,
  },
  grabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  amountPrefix: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  destInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
  },
  actionBtn: {
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
