import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../types';
import { useTheme } from '../theme/ThemeContext';

interface TransactionRowProps {
  transaction: Transaction;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({ transaction }) => {
  const { colors } = useTheme();

  const isBuy = transaction.type === 'Buy';
  const isDeposit = transaction.type === 'Deposit';
  const isSell = transaction.type === 'Sell';
  const isCredit = isSell || isDeposit;

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    if (isBuy) return 'arrow-down-circle-outline';
    if (isSell) return 'arrow-up-circle-outline';
    if (isDeposit) return 'wallet-outline';
    return 'card-outline';
  };

  return (
    <View style={[styles.container, { borderBottomColor: colors.surfaceBorder }]}>
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: isCredit ? colors.creditGreenBg : colors.debitRedBg,
            borderColor: colors.surfaceBorder,
          },
        ]}
      >
        <Ionicons
          name={getIcon()}
          size={18}
          color={isCredit ? colors.creditGreen : colors.debitRed}
        />
      </View>

      <View style={styles.detailsCol}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {isBuy
            ? `Purchased from ${transaction.sellerOrBuyerName}`
            : isSell
            ? `Sold to ${transaction.sellerOrBuyerName}`
            : transaction.sellerOrBuyerName}
        </Text>
        <Text style={[styles.subText, { color: colors.textMuted }]}>
          {transaction.timestamp} • {transaction.txHash}
        </Text>
      </View>

      <View style={styles.amountCol}>
        <Text
          style={[
            styles.amount,
            { color: isCredit ? colors.creditGreen : colors.debitRed },
          ]}
        >
          {isCredit ? '+' : '-'} ₹ {transaction.totalAmount.toFixed(2)}
        </Text>

        {transaction.kwhAmount > 0 && (
          <Text style={[styles.kwhText, { color: colors.textMuted }]}>
            {transaction.kwhAmount} kWh @ ₹{transaction.pricePerKwh.toFixed(2)}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailsCol: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  subText: {
    fontSize: 11,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  kwhText: {
    fontSize: 10,
  },
});
