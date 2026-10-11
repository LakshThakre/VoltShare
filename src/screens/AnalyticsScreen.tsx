import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { EnergyCard } from '../components/EnergyCard';
import { EnergyChart } from '../components/EnergyChart';
import { MOCK_CARBON_STATS, WEEKLY_ANALYTICS_DATA } from '../data/mockData';

export const AnalyticsScreen: React.FC = () => {
  const { colors } = useTheme();
  const [timeframe, setTimeframe] = useState<'Day' | 'Week' | 'Month'>('Week');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Analytics</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            Solar Energy & Environmental Impact
          </Text>
        </View>

        <TouchableOpacity style={styles.exportBtn}>
          <Ionicons name="download-outline" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Timeframe Selector Pill */}
        <View style={[styles.timeframeBox, { backgroundColor: colors.secondary, borderColor: colors.surfaceBorder }]}>
          {(['Day', 'Week', 'Month'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.timeframeBtn,
                timeframe === t && { backgroundColor: colors.primary },
              ]}
              onPress={() => setTimeframe(t)}
            >
              <Text
                style={[
                  styles.timeframeText,
                  { color: timeframe === t ? colors.primaryForeground : colors.textSecondary },
                ]}
              >
                {t}ly
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Energy Generation vs Peer Trade Bar Chart */}
        <EnergyCard style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                Energy Traded ({timeframe}ly)
              </Text>
              <Text style={[styles.chartSub, { color: colors.textMuted }]}>
                Solar Produced vs Peer Sold (kWh)
              </Text>
            </View>

            <View style={[styles.trendBadge, { backgroundColor: colors.secondary, borderColor: colors.surfaceBorder }]}>
              <Ionicons name="trending-up" size={13} color={colors.textPrimary} />
              <Text style={[styles.trendText, { color: colors.textPrimary }]}>+24.8%</Text>
            </View>
          </View>

          <EnergyChart
            type="bar"
            labels={WEEKLY_ANALYTICS_DATA.labels}
            dataSeries1={WEEKLY_ANALYTICS_DATA.producedKwh}
            dataSeries2={WEEKLY_ANALYTICS_DATA.soldKwh}
            series1Label="Produced (kWh)"
            series2Label="Sold to Peers (kWh)"
            height={200}
          />
        </EnergyCard>

        {/* Carbon Offset & Climate Impact Hero Grid */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Impact Metrics
        </Text>

        <View style={styles.impactGrid}>
          {/* CO2 Avoided */}
          <EnergyCard style={styles.impactCard}>
            <View style={[styles.impactIconCircle, { backgroundColor: colors.secondary, borderColor: colors.surfaceBorder }]}>
              <Ionicons name="leaf-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.impactValue, { color: colors.textPrimary }]}>
              {MOCK_CARBON_STATS.co2AvoidedKg} <Text style={styles.impactUnit}>kg</Text>
            </Text>
            <Text style={[styles.impactLabel, { color: colors.textPrimary }]}>CO₂ Avoided</Text>
            <Text style={[styles.impactSub, { color: colors.textMuted }]}>vs fossil grid power</Text>
          </EnergyCard>

          {/* Trees Equivalent */}
          <EnergyCard style={styles.impactCard}>
            <View style={[styles.impactIconCircle, { backgroundColor: colors.secondary, borderColor: colors.surfaceBorder }]}>
              <Ionicons name="flower-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.impactValue, { color: colors.textPrimary }]}>
              {MOCK_CARBON_STATS.treesPlantedEquivalent}
            </Text>
            <Text style={[styles.impactLabel, { color: colors.textPrimary }]}>Trees Planted Equiv.</Text>
            <Text style={[styles.impactSub, { color: colors.textMuted }]}>Absorbed carbon offset</Text>
          </EnergyCard>

          {/* EV Miles Powered */}
          <EnergyCard style={styles.impactCard}>
            <View style={[styles.impactIconCircle, { backgroundColor: colors.secondary, borderColor: colors.surfaceBorder }]}>
              <Ionicons name="car-sport-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.impactValue, { color: colors.textPrimary }]}>
              {MOCK_CARBON_STATS.evMilesPowered} <Text style={styles.impactUnit}>mi</Text>
            </Text>
            <Text style={[styles.impactLabel, { color: colors.textPrimary }]}>Clean EV Miles</Text>
            <Text style={[styles.impactSub, { color: colors.textMuted }]}>Charged via P2P solar</Text>
          </EnergyCard>

          {/* Grid Independence % */}
          <EnergyCard style={styles.impactCard}>
            <View style={[styles.impactIconCircle, { backgroundColor: colors.secondary, borderColor: colors.surfaceBorder }]}>
              <Ionicons name="flash-off-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.impactValue, { color: colors.textPrimary }]}>
              {MOCK_CARBON_STATS.gridIndependencePercent}%
            </Text>
            <Text style={[styles.impactLabel, { color: colors.textPrimary }]}>Grid Independence</Text>
            <Text style={[styles.impactSub, { color: colors.textMuted }]}>Self-sufficient clean energy</Text>
          </EnergyCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    marginTop: 1,
  },
  exportBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
  },
  timeframeBox: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 3,
    marginBottom: 16,
  },
  timeframeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 6,
  },
  timeframeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartCard: {
    marginBottom: 16,
    padding: 14,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  chartSub: {
    fontSize: 11,
    marginTop: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  impactCard: {
    width: '46%',
    margin: '2%',
    padding: 12,
  },
  impactIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  impactValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  impactUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  impactLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  impactSub: {
    fontSize: 10,
  },
});
