import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { productApi } from '../services/api';
import { spacing } from '../theme';

interface InventoryBatch {
  _id: string;
  quantityAvailable: number;
  expiryDate?: string;
  status: 'active' | 'depleted' | 'expired' | 'returned';
}

interface Product {
  _id: string;
  name: string;
  price: number;
  costPrice?: number;
  stock: number;
  category?: string;
  unit?: string;
  icon?: string;
  hsnCode?: string;
  gstRate?: number;
  batches?: InventoryBatch[];
}

const CATS = [
  { key: 'All', icon: '🛍️' },
  { key: 'Grain', icon: '🌾' },
  { key: 'Flour', icon: '🌾' },
  { key: 'Pulses', icon: '🍲' },
  { key: 'Oil', icon: '🌻' },
  { key: 'Dairy', icon: '🥛' },
  { key: 'Spices', icon: '🌶️' },
  { key: 'Vegetables', icon: '🍅' },
  { key: 'Cleaning', icon: '🧼' },
  { key: 'Grocery', icon: '🍬' },
];

interface ProductCardItemProps {
  item: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string, name: string) => void;
  isDark: boolean;
}

const ProductCardItem: React.FC<ProductCardItemProps> = ({ item, onEdit, onDelete, isDark }) => {
  const isLowStock = item.stock > 0 && item.stock <= 5;
  const isOutOfStock = item.stock <= 0;

  const stockBadgeBg = isOutOfStock ? '#EF4444' : isLowStock ? '#F97316' : '#10B981';
  const stockBadgeText = isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'IN STOCK';
  const borderCol = isOutOfStock ? '#EF4444' : isLowStock ? '#F97316' : '#10B981';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        s.productCard,
        {
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
        },
      ]}
      onPress={() => onEdit(item)}
    >
      <View style={s.cardInner}>
        {/* Profile/Identity Section */}
        <View style={s.cardLeft}>
          <View style={[s.iconBox, { borderColor: borderCol }]}>
            <Text style={s.iconChar}>{item.icon || '📦'}</Text>
          </View>
          <View style={s.detailsBox}>
            <Text style={[s.pName, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={s.metaRow}>
              {item.category && (
                <Text style={s.categoryBadge}>{item.category.toUpperCase()}</Text>
              )}
              {item.unit && (
                <Text style={s.unitText}>/ {item.unit}</Text>
              )}
            </View>
          </View>
        </View>

        {/* GST / HSN Tax Badges */}
        <View style={s.taxBox}>
          {item.hsnCode && (
            <View style={[s.taxBadge, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <Text style={[s.taxText, { color: isDark ? '#94A3B8' : '#475569' }]}>HSN {item.hsnCode}</Text>
            </View>
          )}
          {item.gstRate !== undefined && (
            <View style={[s.taxBadge, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
              <Text style={[s.taxText, { color: isDark ? '#94A3B8' : '#475569' }]}>GST {item.gstRate}%</Text>
            </View>
          )}
        </View>

        {/* Stock Status & Pricing info */}
        <View style={s.cardRight}>
          <View style={[s.stockIndicator, { backgroundColor: stockBadgeBg }]}>
            <Text style={s.stockIndicatorText}>{stockBadgeText}</Text>
          </View>
          
          <View style={s.priceBox}>
            <Text style={[s.priceVal, { color: isDark ? '#34D399' : '#059669' }]}>
              ₹{item.price}
            </Text>
            {item.costPrice && (
              <Text style={s.costPriceVal}>Cost: ₹{item.costPrice}</Text>
            )}
            <Text style={[s.stockVal, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Stock: <Text style={s.boldText}>{item.stock}</Text>
            </Text>
          </View>

          {/* Action Row */}
          <View style={s.cardActions}>
            <TouchableOpacity onPress={() => onEdit(item)} style={s.actionBtn}>
              <MaterialCommunityIcons name="pencil" size={16} color="#94A3B8" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(item._id, item.name)} style={s.actionBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function ProductsScreen() {
  const { isDark } = useTheme();
  const { addToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');

  // Creation Drawer Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newUnit, setNewUnit] = useState('kg');
  const [newIcon, setNewIcon] = useState('📦');
  const [createLoading, setCreateLoading] = useState(false);

  // Edit Stock/Price Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const loadProducts = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const response = await productApi.getAll();
      setProducts(response.data);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      addToast('Failed to fetch products catalog', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadProducts(true);
  }, [loadProducts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const handleCreateProduct = async () => {
    if (!newName) {
      Alert.alert('Product Name Missing', 'Please enter a product name');
      return;
    }
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid selling price');
      return;
    }
    const stockNum = parseInt(newStock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      Alert.alert('Invalid Stock', 'Please enter a valid stock count');
      return;
    }

    setCreateLoading(true);
    try {
      await productApi.create({
        name: newName,
        price: priceNum,
        costPrice: newCostPrice ? parseFloat(newCostPrice) : undefined,
        stock: stockNum,
        category: newCategory || undefined,
        unit: newUnit,
        icon: newIcon,
      });

      addToast(`${newName} registered successfully!`, 'success');
      setNewName('');
      setNewPrice('');
      setNewCostPrice('');
      setNewStock('');
      setNewCategory('');
      setNewUnit('kg');
      setNewIcon('📦');
      setShowAddForm(false);
      loadProducts();
    } catch (err: any) {
      console.error('Failed to create product:', err);
      addToast(err?.response?.data?.message || 'Failed to create product', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    const priceNum = parseFloat(editPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price');
      return;
    }
    const stockNum = parseInt(editStock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      Alert.alert('Invalid Stock', 'Please enter a valid stock level');
      return;
    }

    setEditLoading(true);
    try {
      await productApi.update(editingProduct._id, {
        price: priceNum,
        costPrice: editCostPrice ? parseFloat(editCostPrice) : undefined,
        stock: stockNum,
      });

      addToast(`${editingProduct.name} updated!`, 'success');
      setEditingProduct(null);
      loadProducts();
    } catch (err: any) {
      console.error('Failed to update product:', err);
      addToast('Failed to update product', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteProduct = (id: string, name: string) => {
    Alert.alert(
      'Delete Product?',
      `Are you sure you want to permanently remove ${name} from your inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await productApi.delete(id);
              addToast('Product deleted successfully', 'success');
              loadProducts();
            } catch (err: any) {
              console.error('Deletion failed:', err);
              addToast('Failed to delete product', 'error');
            }
          },
        },
      ]
    );
  };

  const handleSeedProducts = async () => {
    setLoading(true);
    try {
      await productApi.seed();
      addToast('Demo catalog seeded successfully!', 'success');
      loadProducts();
    } catch (err: any) {
      console.error('Seeding failed:', err);
      addToast('Failed to seed catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Inventory Real-time Analytics Calculations
  const stats = useMemo(() => {
    let totalItems = 0;
    let lowStockCount = 0;
    let totalValue = 0;

    products.forEach((p) => {
      totalItems++;
      if (p.stock > 0 && p.stock <= 5) lowStockCount++;
      totalValue += p.price * p.stock;
    });

    return { totalItems, lowStockCount, totalValue };
  }, [products]);

  // Filtering products by search term and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat =
        selectedCat === 'All' ||
        (p.category && p.category.toLowerCase() === selectedCat.toLowerCase());
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, selectedCat]);

  return (
    <View style={[s.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      {/* Premium Green Header */}
      <View style={s.gradientHeader}>
        <View style={s.headerInner}>
          <View>
            <Text style={s.title}>Inventory Hub</Text>
            <View style={s.subtitleContainer}>
              <Text style={s.subtitle}>SMART CATALOG MANAGER</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={s.toggleFormBtn}
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <MaterialCommunityIcons name={showAddForm ? 'close' : 'plus'} size={22} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Stats Grid overlapping */}
        <View style={s.statsWrapper}>
          <View style={[s.statsGrid, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View style={s.statBox}>
              <Text style={s.statLabel}>PRODUCTS</Text>
              <Text style={[s.statVal, { color: isDark ? '#FFFFFF' : '#1E293B' }]}>{stats.totalItems}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statBox}>
              <Text style={[s.statLabel, { color: '#EF4444' }]}>LOW STOCK</Text>
              <Text style={[s.statVal, { color: '#EF4444' }]}>{stats.lowStockCount}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statBox}>
              <Text style={s.statLabel}>VALUATION</Text>
              <Text style={[s.statVal, { color: '#10B981' }]}>₹{stats.totalValue}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Main Container */}
      <KeyboardAvoidingView
        style={s.mainBody}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Search and Category Filter Section */}
        <View style={s.filtersContainer}>
          <View style={s.searchBar}>
            <TextInput
              style={s.searchInput}
              placeholder="Search by product name"
              placeholderTextColor="#94A3B8"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>

          {/* Emoji Category Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.catScroll}
            contentContainerStyle={s.catScrollContent}
          >
            {CATS.map((cat) => {
              const isActive = selectedCat === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setSelectedCat(cat.key)}
                  style={[
                    s.catChip,
                    isActive
                      ? { backgroundColor: '#10B981', borderColor: '#10B981' }
                      : { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' },
                  ]}
                >
                  <Text style={s.catIcon}>{cat.icon}</Text>
                  <Text style={[s.catText, { color: isActive ? '#FFFFFF' : (isDark ? '#94A3B8' : '#475569') }]}>
                    {cat.key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Collapsible Add Product Form */}
        {showAddForm && (
          <ScrollView style={s.formCard} contentContainerStyle={s.formContent} keyboardShouldPersistTaps="handled">
            <Text style={s.formTitle}>Register New Product</Text>
            
            <View style={s.formGrid}>
              <TextInput
                style={s.formInput}
                placeholder="Product Name (e.g. Basmati Rice)"
                placeholderTextColor="#94A3B8"
                value={newName}
                onChangeText={setNewName}
              />

              <View style={s.formInputRow}>
                <TextInput
                  style={[s.formInput, { flex: 1, marginRight: 8 }]}
                  placeholder="Selling Price (₹)"
                  placeholderTextColor="#94A3B8"
                  value={newPrice}
                  onChangeText={setNewPrice}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[s.formInput, { flex: 1 }]}
                  placeholder="Cost Price (₹)"
                  placeholderTextColor="#94A3B8"
                  value={newCostPrice}
                  onChangeText={setNewCostPrice}
                  keyboardType="numeric"
                />
              </View>

              <View style={s.formInputRow}>
                <TextInput
                  style={[s.formInput, { flex: 1, marginRight: 8 }]}
                  placeholder="Stock Level"
                  placeholderTextColor="#94A3B8"
                  value={newStock}
                  onChangeText={setNewStock}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[s.formInput, { flex: 1 }]}
                  placeholder="Unit (e.g. kg, litre)"
                  placeholderTextColor="#94A3B8"
                  value={newUnit}
                  onChangeText={setNewUnit}
                />
              </View>

              <View style={s.formInputRow}>
                <TextInput
                  style={[s.formInput, { flex: 1, marginRight: 8 }]}
                  placeholder="Category (e.g. Grain)"
                  placeholderTextColor="#94A3B8"
                  value={newCategory}
                  onChangeText={setNewCategory}
                />
                <TextInput
                  style={[s.formInput, { flex: 1 }]}
                  placeholder="Emoji Icon (e.g. 🌾)"
                  placeholderTextColor="#94A3B8"
                  value={newIcon}
                  onChangeText={setNewIcon}
                />
              </View>
            </View>

            <View style={s.formActions}>
              <TouchableOpacity
                style={[s.formBtn, s.cancelBtn]}
                onPress={() => setShowAddForm(false)}
              >
                <Text style={s.cancelBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.formBtn, s.submitBtn]}
                onPress={handleCreateProduct}
                disabled={createLoading}
              >
                {createLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.submitBtnText}>Verify & Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Product Catalog List */}
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={s.loadingText}>Loading Inventory...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <ProductCardItem
                item={item}
                onEdit={(p) => {
                  setEditingProduct(p);
                  setEditPrice(p.price.toString());
                  setEditCostPrice(p.costPrice ? p.costPrice.toString() : '');
                  setEditStock(p.stock.toString());
                }}
                onDelete={handleDeleteProduct}
                isDark={isDark}
              />
            )}
            contentContainerStyle={s.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10B981" />
            }
            ListEmptyComponent={
              <View style={s.emptyState}>
                <MaterialCommunityIcons name="package-variant" size={64} color="#94A3B8" />
                <Text style={s.emptyTitle}>No products in catalog</Text>
                <Text style={s.emptyDesc}>Generate mock bulk products or register items manually above to manage your smart dukaan.</Text>
                <TouchableOpacity
                  style={s.seedBtn}
                  onPress={handleSeedProducts}
                >
                  <MaterialCommunityIcons name="database-import" size={18} color="#FFFFFF" />
                  <Text style={s.seedBtnText}>Generate Demo Inventory</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>

      {/* Manual Stock & Price Editor Modal */}
      <Modal
        visible={editingProduct !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingProduct(null)}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setEditingProduct(null)}
          />
          {editingProduct && (
            <View style={[s.modalCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <View style={s.modalHeader}>
                <Text style={[s.modalTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                  Quick Stock Editor
                </Text>
                <TouchableOpacity onPress={() => setEditingProduct(null)}>
                  <MaterialCommunityIcons name="close" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={s.modalBody}>
                <View style={s.modalIdentity}>
                  <Text style={s.modalIcon}>{editingProduct.icon || '📦'}</Text>
                  <View>
                    <Text style={[s.modalPName, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                      {editingProduct.name}
                    </Text>
                    <Text style={s.modalPUnit}>Selling unit: {editingProduct.unit || 'pcs'}</Text>
                  </View>
                </View>

                {/* Batch list details */}
                {editingProduct.batches && editingProduct.batches.length > 0 && (
                  <View style={s.batchListCard}>
                    <Text style={s.batchHeader}>ACTIVE INVENTORY BATCHES</Text>
                    {editingProduct.batches.map((batch, idx) => (
                      <View key={idx} style={s.batchRow}>
                        <Text style={s.batchLabel}>
                          Batch {idx + 1}
                        </Text>
                        <Text style={s.batchQty}>
                          {batch.quantityAvailable} {editingProduct.unit} available
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={s.modalFields}>
                  <View style={s.modalFieldGroup}>
                    <Text style={s.fieldLabel}>Selling Price (₹)</Text>
                    <TextInput
                      style={[s.modalInput, { color: isDark ? '#FFFFFF' : '#0F172A', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                      value={editPrice}
                      onChangeText={setEditPrice}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={s.modalFieldGroup}>
                    <Text style={s.fieldLabel}>Cost Price (₹)</Text>
                    <TextInput
                      style={[s.modalInput, { color: isDark ? '#FFFFFF' : '#0F172A', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                      value={editCostPrice}
                      onChangeText={setEditCostPrice}
                      keyboardType="numeric"
                      placeholder="N/A"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View style={s.modalFieldGroup}>
                    <Text style={s.fieldLabel}>Stock Quantity</Text>
                    <TextInput
                      style={[s.modalInput, { color: isDark ? '#FFFFFF' : '#0F172A', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                      value={editStock}
                      onChangeText={setEditStock}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={s.modalActions}>
                <TouchableOpacity
                  style={[s.modalBtn, s.modalCancel]}
                  onPress={() => setEditingProduct(null)}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[s.modalBtn, s.modalSubmit]}
                  onPress={handleUpdateProduct}
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={s.submitBtnText}>Save Adjustments</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  gradientHeader: {
    backgroundColor: '#10B981',
    paddingTop: 50,
    paddingBottom: 48,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
  },
  subtitleContainer: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1.5,
  },
  toggleFormBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsWrapper: {
    position: 'absolute',
    bottom: -24,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statVal: {
    fontSize: 15,
    fontWeight: '900',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(148,163,184,0.15)',
  },
  mainBody: {
    flex: 1,
    paddingTop: 36,
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchBar: {
    height: 46,
    backgroundColor: 'rgba(148,163,184,0.08)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  searchInput: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  catScroll: {
    marginTop: 2,
  },
  catScrollContent: {
    gap: 8,
    paddingRight: spacing.lg,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  catIcon: {
    fontSize: 14,
  },
  catText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.md,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.06)',
  },
  iconChar: {
    fontSize: 22,
  },
  detailsBox: {
    flex: 1,
  },
  pName: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94A3B8',
    backgroundColor: 'rgba(148,163,184,0.1)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  unitText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  taxBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
  },
  taxBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  taxText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  stockIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockIndicatorText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  priceVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  costPriceVal: {
    fontSize: 8,
    fontWeight: '700',
    color: '#94A3B8',
  },
  stockVal: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  boldText: {
    fontWeight: '900',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  actionBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(148,163,184,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: spacing.xs,
    paddingBottom: 120,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: spacing.md,
  },
  emptyState: {
    marginHorizontal: spacing.lg,
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#475569',
    marginTop: spacing.md,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  seedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: 16,
    gap: spacing.sm,
  },
  seedBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  formCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: '#10B981',
    borderRadius: 24,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  formContent: {
    paddingBottom: spacing.sm,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    marginBottom: spacing.sm,
  },
  formGrid: {
    gap: 8,
  },
  formInput: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  formInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  formBtn: {
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
  },
  submitBtn: {
    backgroundColor: '#000000',
  },
  submitBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 32,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  modalBody: {
    gap: spacing.md,
  },
  modalIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  modalIcon: {
    fontSize: 32,
    backgroundColor: 'rgba(148,163,184,0.08)',
    padding: 8,
    borderRadius: 16,
  },
  modalPName: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalPUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  batchListCard: {
    backgroundColor: 'rgba(148,163,184,0.06)',
    padding: spacing.md,
    borderRadius: 16,
    gap: 6,
  },
  batchHeader: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 2,
  },
  batchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  batchQty: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  modalFields: {
    gap: spacing.sm,
  },
  modalFieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
  },
  modalInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  modalBtn: {
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancel: {
    backgroundColor: 'rgba(148,163,184,0.1)',
  },
  modalSubmit: {
    backgroundColor: '#10B981',
  },
});
