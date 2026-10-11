// Minimalist Shadcn UI design system tokens with Light and Dark mode parity
export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  primaryGlow: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  background: string;
  surface: string;
  surfaceBorder: string;
  border: string;
  card: string;
  cardForeground: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  muted: string;
  mutedForeground: string;
  gridOrange: string;
  solarGreen: string;
  buyerBlue: string;
  danger: string;
  success: string;
  warning: string;
  creditGreen: string;
  creditGreenBg: string;
  debitRed: string;
  debitRedBg: string;
  solarGold: string;
  solarGoldBg: string;
  inputBg: string;
  tabBarBg: string;
  tabBarBorder: string;
  statusBadgeBg: string;
  statusBadgeText: string;
  badgeBg: string;
  badgeText: string;
}

export const lightColors: ThemeColors = {
  primary: '#18181B', // Zinc 900 (Black)
  primaryForeground: '#FAFAFA',
  primaryGlow: 'rgba(24, 24, 27, 0.06)',
  secondary: '#F4F4F5', // Zinc 100
  secondaryForeground: '#18181B',
  accent: '#09090B', // Zinc 950
  background: '#FAFAFA', // Figma canvas background
  surface: '#FFFFFF',
  surfaceBorder: '#E4E4E7', // Zinc 200
  border: '#E4E4E7',
  card: '#FFFFFF', // Figma card background
  cardForeground: '#09090B',
  textPrimary: '#09090B', // Zinc 950
  textSecondary: '#71717A', // Zinc 500
  textMuted: '#71717A', // Zinc 500 (matching figma --muted-fg)
  muted: '#F4F4F5',
  mutedForeground: '#71717A',
  gridOrange: '#18181B',
  solarGreen: '#10B981',
  buyerBlue: '#18181B',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  creditGreen: '#10B981', // Semantic Green for Credit/Active
  creditGreenBg: '#ECFDF5',
  debitRed: '#EF4444', // Semantic Red for Debit/Inactive
  debitRedBg: '#FEF2F2',
  solarGold: '#F59E0B',
  solarGoldBg: '#FEF3C7',
  inputBg: '#F4F4F5',
  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E4E4E7',
  statusBadgeBg: '#F4F4F5',
  statusBadgeText: '#18181B',
  badgeBg: '#F4F4F5',
  badgeText: '#18181B',
};

export const darkColors: ThemeColors = {
  primary: '#FAFAFA', // Zinc 50 (Pure White)
  primaryForeground: '#09090B',
  primaryGlow: 'rgba(250, 250, 250, 0.12)',
  secondary: '#27272A', // Zinc 800
  secondaryForeground: '#FAFAFA',
  accent: '#FAFAFA',
  background: '#09090B', // Zinc 950 (Black)
  surface: '#18181B', // Zinc 900
  surfaceBorder: '#27272A', // Zinc 800
  border: '#27272A',
  card: '#18181B',
  cardForeground: '#FAFAFA',
  textPrimary: '#FAFAFA', // Zinc 50
  textSecondary: '#A1A1AA', // Zinc 400
  textMuted: '#71717A', // Zinc 500
  muted: '#27272A',
  mutedForeground: '#A1A1AA',
  gridOrange: '#FAFAFA',
  solarGreen: '#22C55E',
  buyerBlue: '#FAFAFA',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#FBBF24',
  creditGreen: '#22C55E', // Semantic Green for Credit/Active
  creditGreenBg: '#052E16',
  debitRed: '#EF4444', // Semantic Red for Debit/Inactive
  debitRedBg: '#450A0A',
  solarGold: '#F59E0B',
  solarGoldBg: '#451A03',
  inputBg: '#09090B',
  tabBarBg: '#09090B',
  tabBarBorder: '#27272A',
  statusBadgeBg: '#27272A',
  statusBadgeText: '#FAFAFA',
  badgeBg: '#27272A',
  badgeText: '#FAFAFA',
};
