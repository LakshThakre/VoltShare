import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserRole } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { user, setRole, logout } = useAuth();

  const performLogout = async () => {
    try {
      await logout();
      const parent = navigation.getParent();
      if (parent) {
        parent.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        navigation.navigate('Login' as never);
      }
    } catch (e) {
      console.warn('Logout navigation warning:', e);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm('Are you sure you want to log out of VoltShare?')
          : true;
      if (confirmed) {
        performLogout();
      }
      return;
    }

    Alert.alert('Log Out', 'Are you sure you want to log out of VoltShare?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: performLogout,
      },
    ]);
  };

  const initialLetter = user.name ? user.name.charAt(0).toUpperCase() : 'P';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header matching Figma Screen 07 */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Account & Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Profile Card matching Figma Screen 07 */}
        <View style={[styles.appCard, styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.muted }]}>
            <Text style={[styles.avatarText, { color: colors.textPrimary }]}>{initialLetter}</Text>
          </View>
          <View style={styles.profileTextCol}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>
              {user.name || 'Prosumer Account'}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textMuted }]}>
              {user.email || 'Not signed in'}
            </Text>
            <Text
              style={[
                styles.meterActiveText,
                { color: user.isMeterConnected ? colors.creditGreen : colors.textMuted },
              ]}
            >
              {user.isMeterConnected ? `Meter #${user.meterId} Active` : 'Smart Meter Unpaired'}
            </Text>
          </View>
        </View>

        {/* Trading Role matching Figma Screen 07 */}
        <View style={styles.roleSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Trading Role</Text>
          <View style={[styles.segmented, { backgroundColor: colors.muted }]}>
            {(['Buyer', 'Seller', 'Both'] as UserRole[]).map((role) => {
              const isSelected = user.role === role;
              return (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.segmentedItem,
                    isSelected && [styles.segmentedItemActive, { backgroundColor: colors.card }],
                  ]}
                  onPress={() => setRole(role)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentedItemText,
                      {
                        color: isSelected ? colors.textPrimary : colors.textMuted,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {role}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Settings Card with Rows matching Figma Screen 07 */}
        <View style={[styles.appCard, styles.settingsCard, { backgroundColor: colors.card }]}>
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Theme Preference</Text>
            <Text style={[styles.settingValue, { color: colors.textMuted }]}>Auto / System</Text>
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Smart Meter Sync</Text>
            <Text style={[styles.settingValue, { color: colors.creditGreen, fontWeight: '600' }]}>
              Realtime (5s)
            </Text>
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>UPI & Wallet PIN</Text>
            <Text style={[styles.settingValue, { color: colors.textMuted }]}>Configured</Text>
          </View>
        </View>

        {/* Log Out Button matching Figma Screen 07 */}
        <TouchableOpacity
          style={[styles.btnOutline, { borderColor: colors.debitRed }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={[styles.btnOutlineText, { color: colors.debitRed }]}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
    padding: 14,
    gap: 12,
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  profileTextCol: {
    gap: 2,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 10,
  },
  meterActiveText: {
    fontSize: 10,
    fontWeight: '600',
  },
  roleSection: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
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
  settingsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 11,
  },
  settingValue: {
    fontSize: 11,
  },
  btnOutline: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnOutlineText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
