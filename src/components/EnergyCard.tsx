import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface EnergyCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'glow' | 'outlined';
}

export const EnergyCard: React.FC<EnergyCardProps> = ({ children, style, variant = 'default' }) => {
  const { colors, isDarkMode } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: variant === 'glow' ? colors.primary : colors.surfaceBorder,
          shadowColor: isDarkMode ? '#000000' : '#09090B',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
});
