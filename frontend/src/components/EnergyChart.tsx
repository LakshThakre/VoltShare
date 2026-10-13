import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Rect, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

interface EnergyChartProps {
  type?: 'line' | 'bar';
  labels: string[];
  dataSeries1: number[];
  dataSeries2?: number[];
  series1Label?: string;
  series2Label?: string;
  height?: number;
}

export const EnergyChart: React.FC<EnergyChartProps> = ({
  type = 'line',
  labels,
  dataSeries1,
  dataSeries2,
  series1Label = 'Solar Generation',
  series2Label = 'Consumption',
  height = 180,
}) => {
  const { colors, isDarkMode } = useTheme();
  const screenWidth = Dimensions.get('window').width - 64;
  const padding = 24;
  const chartWidth = Math.max(280, screenWidth);
  const chartHeight = height - 40;

  const allValues = [...dataSeries1, ...(dataSeries2 || [])];
  const maxVal = Math.max(...allValues, 10);

  if (type === 'bar') {
    const barWidth = Math.floor((chartWidth - padding * 2) / labels.length / 2.5);
    return (
      <View style={styles.container}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.textPrimary }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{series1Label}</Text>
          </View>
          {dataSeries2 && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.textMuted }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{series2Label}</Text>
            </View>
          )}
        </View>

        <Svg width={chartWidth} height={chartHeight + 30}>
          {[0, 0.5, 1].map((ratio, i) => {
            const y = chartHeight * ratio + 10;
            return (
              <Line
                key={i}
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke={colors.surfaceBorder}
                strokeDasharray="4"
              />
            );
          })}

          {labels.map((label, idx) => {
            const groupWidth = (chartWidth - padding * 2) / labels.length;
            const xCenter = padding + idx * groupWidth + groupWidth / 2;

            const val1 = dataSeries1[idx] || 0;
            const h1 = (val1 / maxVal) * (chartHeight - 20);
            const y1 = chartHeight + 10 - h1;

            const val2 = dataSeries2 ? dataSeries2[idx] || 0 : 0;
            const h2 = (val2 / maxVal) * (chartHeight - 20);
            const y2 = chartHeight + 10 - h2;

            return (
              <React.Fragment key={idx}>
                {/* Bar 1 */}
                <Rect
                  x={xCenter - barWidth - 2}
                  y={y1}
                  width={barWidth}
                  height={h1}
                  fill={colors.textPrimary}
                  rx={2}
                />
                {/* Bar 2 */}
                {dataSeries2 && (
                  <Rect
                    x={xCenter + 2}
                    y={y2}
                    width={barWidth}
                    height={h2}
                    fill={colors.textMuted}
                    rx={2}
                  />
                )}
                {/* Label */}
                <SvgText
                  x={xCenter}
                  y={chartHeight + 25}
                  fontSize="10"
                  fill={colors.textMuted}
                  textAnchor="middle"
                >
                  {label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    );
  }

  // Line Chart rendering
  const stepX = (chartWidth - padding * 2) / (labels.length - 1 || 1);

  const getPoints = (series: number[]) => {
    return series.map((val, idx) => {
      const x = padding + idx * stepX;
      const y = chartHeight + 10 - (val / maxVal) * (chartHeight - 30);
      return { x, y, val };
    });
  };

  const pts1 = getPoints(dataSeries1);
  const pathD1 = pts1.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );
  const areaD1 = `${pathD1} L ${pts1[pts1.length - 1].x} ${chartHeight + 10} L ${pts1[0].x} ${chartHeight + 10} Z`;

  const pts2 = dataSeries2 ? getPoints(dataSeries2) : [];
  const pathD2 = pts2.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );

  return (
    <View style={styles.container}>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.textPrimary }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{series1Label}</Text>
        </View>
        {dataSeries2 && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.textMuted }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{series2Label}</Text>
          </View>
        )}
      </View>

      <Svg width={chartWidth} height={chartHeight + 30}>
        <Defs>
          <LinearGradient id="gradient1" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.textPrimary} stopOpacity={isDarkMode ? '0.2' : '0.08'} />
            <Stop offset="100%" stopColor={colors.textPrimary} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Grid Lines */}
        {[0.2, 0.5, 0.8].map((ratio, i) => {
          const y = chartHeight * ratio + 10;
          return (
            <Line
              key={i}
              x1={padding}
              y1={y}
              x2={chartWidth - padding}
              y2={y}
              stroke={colors.surfaceBorder}
              strokeDasharray="3"
            />
          );
        })}

        {/* Filled Area for Series 1 */}
        <Path d={areaD1} fill="url(#gradient1)" />

        {/* Line 1 */}
        <Path d={pathD1} fill="none" stroke={colors.textPrimary} strokeWidth="2" />

        {/* Line 2 */}
        {dataSeries2 && (
          <Path d={pathD2} fill="none" stroke={colors.textMuted} strokeWidth="1.5" strokeDasharray="4" />
        )}

        {/* Data Dots & X Labels */}
        {pts1.map((pt, idx) => (
          <React.Fragment key={idx}>
            <Circle cx={pt.x} cy={pt.y} r="3.5" fill={colors.surface} stroke={colors.textPrimary} strokeWidth="1.5" />
            <SvgText
              x={pt.x}
              y={chartHeight + 25}
              fontSize="10"
              fill={colors.textMuted}
              textAnchor="middle"
            >
              {labels[idx]}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
