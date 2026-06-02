import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48) / 2;

const PRODUCTS = [
  { _id: '1', name: 'Basmati Rice', icon: '🍚', price: 120, unit: 'kg', stock: 50, category: 'Grocery' },
  { _id: '2', name: 'Tata Salt', icon: '🧂', price: 18, unit: 'kg', stock: 100, category: 'Grocery' },
  { _id: '3', name: 'Fortune Oil', icon: '🫒', price: 210, unit: 'L', stock: 30, category: 'Grocery' },
  { _id: '4', name: 'Amul Butter', icon: '🧈', price: 55, unit: 'pkt', stock: 20, category: 'Dairy' },
  { _id: '5', name: 'Amul Milk', icon: '🥛', price: 28, unit: 'L', stock: 15, category: 'Dairy' },
  { _id: '6', name: 'Coca Cola', icon: '🥤', price: 40, unit: 'can', stock: 48, category: 'Beverages' },
  { _id: '7', name: 'Lays Chips', icon: '🥨', price: 20, unit: 'pkt', stock: 60, category: 'Snacks' },
  { _id: '8', name: 'Surf Excel', icon: '🧴', price: 120, unit: 'kg', stock: 25, category: 'Household' },
  { _id: '9', name: 'Colgate', icon: '🪥', price: 85, unit: 'pcs', stock: 40, category: 'Personal Care' },
];

const CATS = [
  { key: 'All', icon: '🛍️' },
  { key: 'Grocery', icon: '🛒' },
  { key: 'Dairy', icon: '🥛' },
  { key: 'Beverages', icon: '🧃' },
  { key: 'Snacks', icon: '🍿' },
  { key: 'Household', icon: '🧹' },
  { key: 'Personal Care', icon: '🧴' },
];

const BillingProductCard = React.memo(({ product }: any) => {
  const { colors } = useTheme();
  const isOutOfStock = product.stock <= 0;
  const lowStock = product.stock <= 3 && product.stock > 0;

  let badgeText = '';
  let badgeBg = '#10B981';
  if (lowStock) { badgeText = 'Low Stock'; badgeBg = '#EF4444'; }
  else if (product.price > 300) { badgeText = 'Premium'; badgeBg = '#1F2937'; }
  else { badgeText = 'Popular'; badgeBg = '#10B981'; }

  return (
    <View style={[s.card, isOutOfStock && s.cardOutOfStock]}>
      {!isOutOfStock && (
        <View style={[s.badge, { backgroundColor: badgeBg }]}>
          <Text style={s.badgeText}>{badgeText}</Text>
        </View>
      )}
      <View style={s.cardBody}>
        <View style={s.iconWrap}>
          <Text style={s.icon}>{product.icon || '🛒'}</Text>
        </View>
        <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>{product.name}</Text>
        <View style={s.priceRow}>
          <Text style={[s.price, { color: colors.text }]}>₹{product.price}</Text>
          <Text style={s.unit}>/{product.unit}</Text>
        </View>
      </View>
      {!isOutOfStock && (
        <TouchableOpacity style={s.addBtn}>
          <Text style={s.addBtnText}>ADD</Text>
        </TouchableOpacity>
      )}
      {isOutOfStock && (
        <View style={s.soldOutBadge}>
          <Text style={s.soldOutText}>SOLD OUT</Text>
        </View>
      )}
    </View>
  );
});

export default function HomeScreen() {
  const { isDark } = useTheme();
  const [search, setSearch] = React.useState('');
  const [selectedCat, setSelectedCat] = React.useState(0);

  const categories = CATS;
  const activeCat = categories[selectedCat]?.key || 'All';

  const filtered = PRODUCTS.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCat === 0 || p.category === activeCat;
    return matchSearch && matchCat;
  });

  return (
    <View style={[s.container, { backgroundColor: isDark ? '#111827' : '#FFFFFF' }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Gradient Header */}
        <View style={[s.header, { backgroundColor: '#FCD34D' }]}>
          {/* Greeting */}
          <View style={s.greetingRow}>
            <Text style={s.greeting}>Hey Tester! 👋</Text>
            <View style={s.avatarSmall}>
              <MaterialCommunityIcons name="account" size={16} color="#000" />
            </View>
          </View>
          <Text style={s.tapToAdd}>Tap to add</Text>

          {/* Search */}
          <View style={s.searchRow}>
            <View style={[s.searchBar, { backgroundColor: '#FFFFFF' }]}>
              <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
              <TextInput
                style={s.searchInput}
                placeholder="Search products..."
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={setSearch}
              />
              <TouchableOpacity style={s.micBtn}>
                <MaterialCommunityIcons name="microphone" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catContent}>
            {categories.map((cat, idx) => {
              const isActive = selectedCat === idx;
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setSelectedCat(idx)}
                  style={[
                    s.chip,
                    isActive
                      ? { backgroundColor: '#000000', borderColor: '#000000' }
                      : { backgroundColor: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.5)' },
                  ]}
                >
                  <Text style={isActive ? s.chipIconActive : s.chipIcon}>{cat.icon}</Text>
                  <Text style={[s.chipText, { color: isActive ? '#FFFFFF' : '#1F2937' }]}>
                    {cat.key === 'All' ? 'All' : cat.key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Fade gradient at bottom of header */}
          <View style={[s.headerFade, { backgroundColor: isDark ? '#111827' : '#FFFFFF' }]} />
        </View>

        {/* Products Grid */}
        <View style={s.gridSection}>
          <View style={s.grid}>
            {filtered.map((product) => (
              <BillingProductCard key={product._id} product={product} />
            ))}
            {filtered.length === 0 && (
              <View style={s.emptyState}>
                <MaterialCommunityIcons name="package-variant-closed" size={40} color="#D1D5DB" />
                <Text style={s.emptyText}>No products found</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 160 },
  header: { paddingTop: 50, paddingBottom: 0, position: 'relative' },
  greetingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 12, paddingTop: 8,
  },
  greeting: { fontSize: 18, fontWeight: '900', color: '#000', letterSpacing: -0.5 },
  avatarSmall: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  tapToAdd: { fontSize: 24, fontWeight: '900', color: '#000', paddingHorizontal: 16, marginBottom: 16 },
  searchRow: { paddingHorizontal: 16, marginBottom: 24 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16,
    paddingHorizontal: 16, height: 52,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 5,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827', marginLeft: 8 },
  micBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catScroll: { paddingHorizontal: 16, marginBottom: 0 },
  catContent: { gap: 8, paddingRight: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16,
    borderWidth: 1,
  },
  chipText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  chipIcon: { fontSize: 14 },
  chipIconActive: { fontSize: 14, transform: [{ scale: 1.25 }] },
  headerFade: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 60,
    opacity: 0.95,
  },
  gridSection: { paddingHorizontal: 12, marginTop: -24, zIndex: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: CARD_W,
    backgroundColor: 'rgba(254,249,195,0.8)',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(254,240,138,0.5)',
  },
  cardOutOfStock: { opacity: 0.4 },
  badge: {
    position: 'absolute', top: 8, left: 8,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 999, zIndex: 10,
  },
  badgeText: { fontSize: 7, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 1 },
  cardBody: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  icon: { fontSize: 36 },
  name: { fontSize: 14, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  price: { fontSize: 16, fontWeight: '900' },
  unit: { fontSize: 10, color: '#9CA3AF' },
  addBtn: {
    width: '100%', borderRadius: 12,
    paddingVertical: 10, alignItems: 'center',
    backgroundColor: '#10B981',
    marginTop: 8,
  },
  addBtnText: { fontSize: 12, fontWeight: '900', color: '#fff' },
  soldOutBadge: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  soldOutText: {
    fontSize: 10, fontWeight: '900', color: '#fff',
    backgroundColor: '#DC2626', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 8, transform: [{ rotate: '-15deg' }],
    overflow: 'hidden', borderWidth: 2, borderColor: '#fff',
  },
  emptyState: {
    width: '100%', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 80, backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 24, borderWidth: 2, borderStyle: 'dashed',
    borderColor: '#E5E7EB',
  },
  emptyText: { fontSize: 12, fontWeight: '900', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
});
