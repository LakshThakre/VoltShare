export type UserRole = 'Seller' | 'Buyer' | 'Both';

export interface Seller {
  id: string;
  sellerId?: string;
  name: string;
  avatar: string;
  locationName: string;
  distanceKm: number;
  latitude: number;
  longitude: number;
  pricePerKwh: number; // in INR (₹)
  availableKwh: number;
  totalCapacityKw: number;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  energyType: 'Solar' | 'Solar + Battery' | 'Wind & Solar';
  panelBrand: string;
  bio: string;
  badge?: string;
}

export interface Transaction {
  id: string;
  type: 'Buy' | 'Sell' | 'Deposit' | 'Payout';
  sellerOrBuyerName: string;
  kwhAmount: number;
  pricePerKwh: number;
  totalAmount: number;
  timestamp: string; // ISO date string or formatted date
  status: 'Completed' | 'Pending' | 'Failed';
  txHash: string;
}

export interface EnergyPoint {
  timeLabel: string; // e.g. "08:00", "10:00"
  producedKw: number;
  consumedKw: number;
  surplusKw: number;
}

export interface CarbonStats {
  co2AvoidedKg: number;
  treesPlantedEquivalent: number;
  evMilesPowered: number;
  gridIndependencePercent: number;
}

export interface PaymentMethod {
  id: string;
  cardBrand: string;
  lastFour: string;
  isDefault: boolean;
}

export interface FilterState {
  searchQuery: string;
  maxDistanceKm: number;
  priceSort: 'asc' | 'desc'; // low->high or high->low
  minKwhAvailable: number;
  onlyVerified: boolean;
  sortBy?: 'distance' | 'price' | 'rating';
}
