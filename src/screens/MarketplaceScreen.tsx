import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Seller } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { useMarket } from '../context/MarketContext';
import { useAuth } from '../context/AuthContext';
import { BuyModal } from '../components/BuyModal';
import { ListEnergyModal } from '../components/ListEnergyModal';

export const MarketplaceScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { sellers, isRefreshing, refreshMarketplace } = useMarket();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterNearby, setFilterNearby] = useState<boolean>(false);
  const [priceSort, setPriceSort] = useState<'asc' | 'desc'>('asc');
  const [solarOnly, setSolarOnly] = useState<boolean>(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [selectedSellerForBuy, setSelectedSellerForBuy] = useState<Seller | null>(null);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState<boolean>(false);
  const [isListModalOpen, setIsListModalOpen] = useState<boolean>(false);
  const [editSellerListing, setEditSellerListing] = useState<Seller | null>(null);

  const filteredSellers = useMemo(() => {
    return sellers
      .filter((s) => {
        const matchesQuery =
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.locationName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDistance = !filterNearby || s.distanceKm <= 1.0;
        const matchesSolar = !solarOnly || s.energyType.includes('Solar');
        return matchesQuery && matchesDistance && matchesSolar;
      })
      .sort((a, b) => {
        if (priceSort === 'asc') return a.pricePerKwh - b.pricePerKwh;
        return b.pricePerKwh - a.pricePerKwh;
      });
  }, [sellers, searchQuery, filterNearby, solarOnly, priceSort]);

  const handleOpenBuy = (seller: Seller) => {
    setSelectedSellerForBuy(seller);
    setIsBuyModalOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Energy Marketplace</Text>
        <TouchableOpacity
          style={[styles.sellHeaderBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            setEditSellerListing(null);
            setIsListModalOpen(true);
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={15} color={colors.primaryForeground} />
          <Text style={[styles.sellHeaderBtnText, { color: colors.primaryForeground }]}>+ Sell Energy</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Row matching Figma Screen 04 */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search sellers..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => setIsFilterModalOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterBtnText, { color: colors.textPrimary }]}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips matching Figma Screen 04 */}
      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[
            styles.appBadge,
            filterNearby ? styles.badgeGreenActive : styles.badgeGreen,
          ]}
          onPress={() => setFilterNearby((prev) => !prev)}
        >
          <Text style={[styles.badgeText, { color: '#10B981' }]}>
            {filterNearby ? '✓ < 1 km' : '< 1 km'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.appBadge,
            priceSort === 'asc' ? styles.badgeSolarActive : styles.badgeSolar,
          ]}
          onPress={() => setPriceSort((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
        >
          <Text style={[styles.badgeText, { color: '#F59E0B' }]}>
            {priceSort === 'asc' ? 'Lowest Price' : 'Highest Price'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.appBadge,
            solarOnly ? styles.badgeMutedActive : styles.badgeMuted,
          ]}
          onPress={() => setSolarOnly((prev) => !prev)}
        >
          <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
            {solarOnly ? '✓ Solar Only' : 'Solar Only'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Listings FlatList */}
      <FlatList
        data={filteredSellers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refreshMarketplace} tintColor={colors.textPrimary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="sunny-outline" size={44} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Listings Found</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              There are no surplus solar offers right now. Be the first to share your clean solar power!
            </Text>
            <TouchableOpacity
              style={[styles.emptyListBtn, { backgroundColor: colors.creditGreen }]}
              onPress={() => {
                setEditSellerListing(null);
                setIsListModalOpen(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="flash" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyListBtnText}>+ List Your Solar Energy</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const isOwnListing = Boolean(user?.id && item.sellerId === user.id);
          return (
            /* Listing Card matching Figma Screen 04 */
            <View style={[styles.appCard, { backgroundColor: colors.card }]}>
              <View style={styles.cardTopRow}>
                <View style={styles.sellerIdentityRow}>
                  <View style={[styles.avatarCircle, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.avatarText, { color: colors.textPrimary }]}>
                      {getInitials(item.name)}
                    </Text>
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.sellerName, { color: colors.textPrimary }]}>{item.name}</Text>
                      {isOwnListing && (
                        <View style={[styles.appBadge, { backgroundColor: '#ECFDF5' }]}>
                          <Text style={[styles.badgeText, { color: '#10B981', fontSize: 9 }]}>You</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.sellerDistance, { color: colors.textMuted }]}>
                      {item.distanceKm.toFixed(1)} km
                    </Text>
                  </View>
                </View>

                <View style={[styles.appBadge, styles.badgeSolar]}>
                  <Text style={[styles.badgeText, { color: '#F59E0B' }]}>
                    {item.availableKwh.toFixed(1)} kWh left
                  </Text>
                </View>
              </View>

              <View style={styles.cardBottomRow}>
                <View>
                  <Text style={[styles.priceTag, { color: colors.creditGreen }]}>
                    ₹ {item.pricePerKwh.toFixed(2)} / kWh
                  </Text>
                  <Text style={[styles.gridTariff, { color: colors.textMuted }]}>Grid: ₹ 8.00</Text>
                </View>

                {isOwnListing ? (
                  <TouchableOpacity
                    style={[styles.btnOutline, { borderColor: colors.border }]}
                    onPress={() => {
                      setEditSellerListing(item);
                      setIsListModalOpen(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.btnOutlineText, { color: colors.textPrimary }]}>
                      Manage Listing
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
                    onPress={() => handleOpenBuy(item)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.btnPrimaryText, { color: colors.primaryForeground }]}>
                      Buy Energy
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Filter Modal */}
      <Modal visible={isFilterModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.filterSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.grabHandle, { backgroundColor: colors.border }]} />
            <View style={styles.filterSheetHeader}>
              <Text style={[styles.filterSheetTitle, { color: colors.textPrimary }]}>
                Filter Marketplace
              </Text>
              <TouchableOpacity onPress={() => setIsFilterModalOpen(false)}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Price Sort */}
            <Text style={[styles.filterGroupLabel, { color: colors.textPrimary }]}>Price Ordering</Text>
            <View style={[styles.segmented, { backgroundColor: colors.muted }]}>
              <TouchableOpacity
                style={[styles.segItem, priceSort === 'asc' && styles.segItemActive]}
                onPress={() => setPriceSort('asc')}
              >
                <Text
                  style={[
                    styles.segItemText,
                    { color: priceSort === 'asc' ? colors.textPrimary : colors.textMuted },
                  ]}
                >
                  Lowest Price First
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segItem, priceSort === 'desc' && styles.segItemActive]}
                onPress={() => setPriceSort('desc')}
              >
                <Text
                  style={[
                    styles.segItemText,
                    { color: priceSort === 'desc' ? colors.textPrimary : colors.textMuted },
                  ]}
                >
                  Highest First
                </Text>
              </TouchableOpacity>
            </View>

            {/* Distance Filter */}
            <Text style={[styles.filterGroupLabel, { color: colors.textPrimary }]}>Proximity</Text>
            <View style={[styles.segmented, { backgroundColor: colors.muted }]}>
              <TouchableOpacity
                style={[styles.segItem, !filterNearby && styles.segItemActive]}
                onPress={() => setFilterNearby(false)}
              >
                <Text
                  style={[
                    styles.segItemText,
                    { color: !filterNearby ? colors.textPrimary : colors.textMuted },
                  ]}
                >
                  All Distances
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segItem, filterNearby && styles.segItemActive]}
                onPress={() => setFilterNearby(true)}
              >
                <Text
                  style={[
                    styles.segItemText,
                    { color: filterNearby ? colors.textPrimary : colors.textMuted },
                  ]}
                >
                  Within 1.0 km
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: colors.primary, marginTop: 12 }]}
              onPress={() => setIsFilterModalOpen(false)}
            >
              <Text style={[styles.btnPrimaryText, { color: colors.primaryForeground }]}>
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Buy Flow Modal (Figma Screen 05) */}
      <BuyModal
        seller={selectedSellerForBuy}
        visible={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        onViewWallet={() => {
          setIsBuyModalOpen(false);
          navigation.navigate('WalletTab');
        }}
      />

      {/* List / Edit Energy Modal */}
      <ListEnergyModal
        visible={isListModalOpen}
        onClose={() => {
          setIsListModalOpen(false);
          setEditSellerListing(null);
        }}
        initialKwh={editSellerListing?.availableKwh}
        initialPrice={editSellerListing?.pricePerKwh}
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sellHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  sellHeaderBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    marginTop: 6,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 11,
    padding: 0,
  },
  filterBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  appBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  badgeGreen: {
    backgroundColor: '#ECFDF5',
  },
  badgeGreenActive: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  badgeSolar: {
    backgroundColor: '#FEF3C7',
  },
  badgeSolarActive: {
    backgroundColor: '#FDE68A',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  badgeMuted: {
    backgroundColor: '#F4F4F5',
  },
  badgeMutedActive: {
    backgroundColor: '#E4E4E7',
    borderWidth: 1,
    borderColor: '#71717A',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 10,
  },
  appCard: {
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sellerIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sellerName: {
    fontSize: 12,
    fontWeight: '600',
  },
  sellerDistance: {
    fontSize: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceTag: {
    fontSize: 15,
    fontWeight: '700',
  },
  gridTariff: {
    fontSize: 9,
    marginTop: 1,
  },
  btnPrimary: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  btnOutline: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
  emptyListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyListBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
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
  filterSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterSheetTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  filterGroupLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
  },
  segItem: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  segItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  segItemText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
