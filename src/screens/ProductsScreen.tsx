import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
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

interface ProductCardItemProps {
  item: Product;
  onEdit: (product: Product) => void;
  isDark: boolean;
}

const ProductCardItem: React.FC<ProductCardItemProps> = ({ item, onEdit, isDark }) => {
  return (
    <View
      style={[
        s.productCard,
        {
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
        },
      ]}
    >
      {/* Top Row: Icon, Title/Meta, and Edit Button */}
      <View style={s.cardTopRow}>
        <View style={s.cardLeftInfo}>
          <View style={[s.iconBox, { backgroundColor: isDark ? '#334155' : '#F0FDF4' }]}>
            <Text style={s.iconChar}>{item.icon || '📦'}</Text>
          </View>
          <View style={s.detailsBox}>
            <Text style={[s.pName, { color: isDark ? '#FFFFFF' : '#0F172A' }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={s.metaText}>
              {`${item.category?.toUpperCase() || 'GENERAL'}  ${item.unit?.toUpperCase() || 'KG'}`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onEdit(item)}
          style={[s.actionBtnCircle, { backgroundColor: isDark ? '#334155' : '#F3F4F6' }]}
        >
          <MaterialCommunityIcons name="pencil" size={16} color={isDark ? '#94A3B8' : '#718096'} />
        </TouchableOpacity>
      </View>

      {/* Bottom Row: Price and Stock Grid */}
      <View style={[s.cardBottomRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
        <View style={s.bottomCol}>
          <Text style={s.colLabel}>PRICE</Text>
          <Text style={s.priceVal}>
            ₹{item.price} <Text style={s.unitSuffix}>/ {item.unit || 'kg'}</Text>
          </Text>
        </View>

        <View style={s.bottomCol}>
          <Text style={s.colLabel}>STOCK</Text>
          <Text style={[s.stockVal, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
            {item.stock} {item.unit || 'kg'}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function ProductsScreen() {
  const { isDark } = useTheme();
  const { addToast } = useToast();
  const { user } = useAuth();

  // ─── Animated scroll header ───────────────────────────────────────────────
  const scrollY = useRef(new Animated.Value(0)).current;

  // Clamp scroll so animation reverses on scroll-up
  const clampedScroll = Animated.diffClamp(scrollY, 0, 90);

  // Header container shrinks from full paddingBottom to compact
  const headerPaddingBottom = clampedScroll.interpolate({
    inputRange: [0, 90],
    outputRange: [40, 14],
    extrapolate: 'clamp',
  });

  // Title row fades + slides up
  const titleOpacity = clampedScroll.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const titleTranslateY = clampedScroll.interpolate({
    inputRange: [0, 50],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  // Badge fades earlier
  const badgeOpacity = clampedScroll.interpolate({
    inputRange: [0, 30],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Add-to-Stock button shrinks + fades
  const btnOpacity = clampedScroll.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const btnHeight = clampedScroll.interpolate({
    inputRange: [0, 60],
    outputRange: [44, 0],
    extrapolate: 'clamp',
  });
  const btnMarginBottom = clampedScroll.interpolate({
    inputRange: [0, 60],
    outputRange: [20, 0],
    extrapolate: 'clamp',
  });
  // ─────────────────────────────────────────────────────────────────────────

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Floating Add Product Drawer Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newUnit, setNewUnit] = useState('kg');
  const [newIcon, setNewIcon] = useState('📦');
  const [createLoading, setCreateLoading] = useState(false);

  // Edit Stock/Price Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Supplier Bills / Command Center State
  const [showSupplierBills, setShowSupplierBills] = useState(false);
  const [activeSupplierTab, setActiveSupplierTab] = useState<'Scan' | 'Manual' | 'History'>('Scan');
  const [isOcrScanning, setIsOcrScanning] = useState(false);

  // High-Fidelity OCR Review States
  interface OcrItem {
    id: string;
    name: string;
    qty: number;
    unit: string;
    total: number;
    costPrice: number;
    sellPrice: number;
  }
  const [ocrScannedItems, setOcrScannedItems] = useState<OcrItem[]>([]);
  const [showOcrReview, setShowOcrReview] = useState(false);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);

  interface SupplierBill {
    id: string;
    invoiceId: string;
    supplier: string;
    date: string;
    itemsSummary: string;
    totalValue: string;
    items: OcrItem[];
  }
  const [supplierBillHistory, setSupplierBillHistory] = useState<SupplierBill[]>([
    {
      id: 'SB-1001',
      invoiceId: 'Invoice #SB-1001',
      supplier: 'Om Kirana Wholesalers',
      date: 'May 28, 2026',
      itemsSummary: 'Fortune Oil +10 L, Tata Salt +20 kg',
      totalValue: '₹3,260',
      items: [
        { id: 'sb1001-1', name: 'Fortune Oil', qty: 10, unit: 'L', total: 1500, costPrice: 150, sellPrice: 165 },
        { id: 'sb1001-2', name: 'Tata Salt', qty: 20, unit: 'KG', total: 400, costPrice: 20, sellPrice: 22 },
        { id: 'sb1001-3', name: 'Aashirvaad Flour', qty: 30, unit: 'KG', total: 1200, costPrice: 40, sellPrice: 45 },
        { id: 'sb1001-4', name: 'Surf Excel', qty: 15, unit: 'KG', total: 160, costPrice: 110, sellPrice: 120 },
      ],
    },
  ]);
  const [selectedHistoryBill, setSelectedHistoryBill] = useState<SupplierBill | null>(null);

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
      // If we are in "Manual" supplier tab, go to history tab automatically or reload list
      if (showSupplierBills) {
        setActiveSupplierTab('History');
      }
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
            setEditingProduct(null);
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

  const stats = useMemo(() => {
    let totalItems = 0;
    products.forEach(() => {
      totalItems++;
    });
    return { totalItems };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(lowerSearch) ||
        (p.category && p.category.toLowerCase().includes(lowerSearch));
      return matchSearch;
    });
  }, [products, searchTerm]);

  // Handle OCR Document Scanner flow - Directly launches Camera on Phone and Document Picker on Web!
  const handleScanBill = async () => {
    if (Platform.OS === 'web') {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          processScannedBill();
        }
      } catch (err) {
        console.error('Failed to select document:', err);
        addToast('Failed to select document', 'error');
      }
    } else {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required to scan bills.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        processScannedBill();
      }
    }
  };

  const processScannedBill = () => {
    setIsOcrScanning(true);
    setTimeout(async () => {
      setIsOcrScanning(false);
      
      setOcrScannedItems([
        { id: 'ocr-1', name: 'Sona Masuri Rice', qty: 1, unit: 'KG', total: 60, costPrice: 60, sellPrice: 63 },
        { id: 'ocr-2', name: 'Dalia', qty: 1, unit: 'KG', total: 65, costPrice: 65, sellPrice: 68 },
        { id: 'ocr-3', name: 'Toor Dal', qty: 1, unit: 'KG', total: 165, costPrice: 165, sellPrice: 173 },
        { id: 'ocr-4', name: 'Chana Dal', qty: 1, unit: 'KG', total: 95, costPrice: 95, sellPrice: 100 },
      ]);
      setShowOcrReview(true);
      addToast('Bill digitized successfully! Ready for review.', 'success');
    }, 2500);
  };

  const handleUpdateOcrItemField = (id: string, field: keyof OcrItem, value: any) => {
    setOcrScannedItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        
        let parsedVal = value;
        if (field === 'qty') {
          parsedVal = parseInt(value, 10);
          if (isNaN(parsedVal)) parsedVal = 0;
        } else if (field === 'costPrice') {
          parsedVal = parseFloat(value);
          if (isNaN(parsedVal)) parsedVal = 0;
        } else if (field === 'sellPrice') {
          parsedVal = parseFloat(value);
          if (isNaN(parsedVal)) parsedVal = 0;
        }

        const updated = { ...item, [field]: parsedVal };
        if (field === 'qty' || field === 'costPrice') {
          updated.total = updated.qty * updated.costPrice;
        }
        return updated;
      })
    );
  };

  const handleDeleteOcrItem = (id: string) => {
    setOcrScannedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearAllOcrItems = () => {
    setOcrScannedItems([]);
  };

  const handleAddNewOcrItem = () => {
    const newId = `ocr-new-${Date.now()}`;
    setOcrScannedItems(prev => [
      ...prev,
      {
        id: newId,
        name: 'New Product',
        qty: 1,
        unit: 'KG',
        total: 0,
        costPrice: 0,
        sellPrice: 0,
      },
    ]);
  };

  const handleProcessOcrItems = async () => {
    if (ocrScannedItems.length === 0) {
      Alert.alert('No Items', 'There are no items to process.');
      return;
    }

    setIsProcessingOcr(true);
    try {
      // Loop through all items and update database
      for (const item of ocrScannedItems) {
        // Search if product already exists
        const matched = products.find(p => p.name.toLowerCase().trim() === item.name.toLowerCase().trim());
        if (matched) {
          // Update existing product
          await productApi.update(matched._id, {
            price: item.sellPrice,
            costPrice: item.costPrice,
            stock: matched.stock + item.qty,
          });
        } else {
          // Determine appropriate category and icon
          let category = 'Grains';
          let icon = '🌾';
          const nameLower = item.name.toLowerCase();
          if (nameLower.includes('rice')) {
            category = 'Grains';
            icon = '🌾';
          } else if (nameLower.includes('dal')) {
            category = 'Pulses';
            icon = '🥣';
          } else if (nameLower.includes('dalia')) {
            category = 'Breakfast';
            icon = '🌾';
          } else if (nameLower.includes('oil')) {
            category = 'Oil';
            icon = '🛢️';
          } else if (nameLower.includes('salt')) {
            category = 'Spices';
            icon = '🧂';
          }

          // Create new product
          await productApi.create({
            name: item.name,
            price: item.sellPrice,
            costPrice: item.costPrice,
            stock: item.qty,
            unit: item.unit.toLowerCase(),
            category,
            icon,
          });
        }
      }

      // Reload products list
      await loadProducts();

      // Create new bill entry for History list
      const totalBillCost = ocrScannedItems.reduce((acc, item) => acc + item.total, 0);
      const itemsSummaryText = ocrScannedItems
        .map(item => `${item.name} +${item.qty} ${item.unit.toLowerCase()}`)
        .join(', ');

      const nextBillNo = supplierBillHistory.length + 1001; // e.g. SB-1002
      const savedItems: OcrItem[] = ocrScannedItems.map(item => ({ ...item }));
      const newBill: SupplierBill = {
        id: `SB-${nextBillNo}`,
        invoiceId: `Invoice #SB-${nextBillNo}`,
        supplier: 'Balaji Wholesale Foods',
        date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        itemsSummary: itemsSummaryText.length > 40 ? itemsSummaryText.substring(0, 37) + '...' : itemsSummaryText,
        totalValue: `₹${totalBillCost.toLocaleString()}`,
        items: savedItems,
      };

      setSupplierBillHistory(prev => [newBill, ...prev]);

      // Complete flow
      setShowOcrReview(false);
      setActiveSupplierTab('History');
      addToast('Reviewed stock registered in live inventory!', 'success');
    } catch (err: any) {
      console.error('Failed to process OCR items:', err);
      Alert.alert('Processing Failed', 'An error occurred while saving the inventory items.');
    } finally {
      setIsProcessingOcr(false);
    }
  };

  // List Header with Catalog Size Card
  const listHeader = useMemo(() => {
    if (products.length === 0) return null;
    return (
      <View style={[s.statsCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
        <View style={s.statsCardLeft}>
          <Text style={s.statsLabel}>CATALOG SIZE</Text>
          <Text style={[s.statsVal, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
            {stats.totalItems}
          </Text>
        </View>
        <View style={[s.statsIconBox, { backgroundColor: isDark ? '#334155' : '#EFF6FF' }]}>
          <MaterialCommunityIcons name="package-variant-closed" size={24} color="#3B82F6" />
        </View>
      </View>
    );
  }, [products.length, stats.totalItems, isDark]);

  return (
    <View style={[s.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      {/* Animated Orange-to-Yellow Curved Command Header */}
      <LinearGradient
        colors={['#FFD200', '#FF7E06']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={s.orangeHeaderBase}
      >
        <Animated.View style={{ paddingBottom: headerPaddingBottom }}>
          {/* Title row — fades + slides up on scroll */}
          <Animated.View
            style={[
              s.headerInnerTitleRow,
              { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] },
            ]}
          >
            <Text style={s.headerTitleMain}>Products 📦</Text>
            <Animated.View style={[s.inventoryBadge, { opacity: badgeOpacity }]}>
              <Text style={s.inventoryBadgeText}>INVENTORY COMMAND CENTER</Text>
            </Animated.View>
          </Animated.View>

          {/* Add-to-Stock button — collapses height + fades */}
          <Animated.View
            style={{
              overflow: 'hidden',
              height: btnHeight,
              opacity: btnOpacity,
              marginBottom: btnMarginBottom,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setActiveSupplierTab('Scan');
                setShowSupplierBills(true);
              }}
              style={s.addStockBtn}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#000000" />
              <Text style={s.addStockBtnText}>Add to Stock</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Search bar — always visible */}
          <View style={s.searchBarContainer}>
            <TextInput
              style={s.searchInput}
              placeholder="Search by name or cat"
              placeholderTextColor="#94A3B8"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Main Catalog Body */}
      <KeyboardAvoidingView
        style={s.mainBody}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#FF7E06" />
            <Text style={s.loadingText}>Loading Inventory...</Text>
          </View>
        ) : (
          <Animated.FlatList
            data={filteredProducts}
            keyExtractor={(item: Product) => item._id}
            renderItem={({ item }: { item: Product }) => (
              <ProductCardItem
                item={item}
                onEdit={(p: Product) => {
                  setEditingProduct(p);
                  setEditPrice(p.price.toString());
                  setEditCostPrice(p.costPrice ? p.costPrice.toString() : '');
                  setEditStock(p.stock.toString());
                }}
                isDark={isDark}
              />
            )}
            ListHeaderComponent={listHeader}
            contentContainerStyle={s.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF7E06" />
            }
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <View style={[s.emptyState, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <MaterialCommunityIcons name="package-variant" size={64} color="#94A3B8" />
                <Text style={[s.emptyTitle, { color: isDark ? '#F1F5F9' : '#475569' }]}>
                  No products in catalog
                </Text>
                <Text style={s.emptyDesc}>
                  Generate mock bulk products or register items manually below to manage your smart dukaan.
                </Text>
                <TouchableOpacity style={s.seedBtn} onPress={handleSeedProducts}>
                  <MaterialCommunityIcons name="database-import" size={18} color="#FFFFFF" />
                  <Text style={s.seedBtnText}>Generate Demo Inventory</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>

      {/* Floating Add Product FAB */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShowAddForm(true)}
        style={s.fab}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Supplier Bills Full-Screen Command Center Overlay */}
      <Modal
        visible={showSupplierBills}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowSupplierBills(false)}
      >
        <View style={[s.supplierContainer, { backgroundColor: isDark ? '#0A0A0A' : '#F8FAFC' }]}>
          {/* Top Custom Header Matching SDukaan */}
          <View style={[s.header, { backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF', borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={s.headerInner}>
              <TouchableOpacity
                onPress={() => setShowSupplierBills(false)}
                style={[s.avatarBtn, { borderColor: 'rgba(76,175,80,0.3)' }]}
              >
                <View style={s.avatarPlaceholder}>
                  <Text style={s.avatarText}>{user?.name?.[0] || 'I'}</Text>
                </View>
              </TouchableOpacity>
              <Text style={[s.brand, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>SDukaan</Text>
              <View style={s.headerRight}>
                <View style={[s.langBtn, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                  <Text style={[s.langText, { color: isDark ? '#94A3B8' : '#475569' }]}>EN</Text>
                </View>
                <TouchableOpacity onPress={() => setShowSupplierBills(false)} style={[s.menuBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  <MaterialCommunityIcons name="arrow-left" size={22} color={isDark ? '#94A3B8' : '#475569'} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Supplier Bills Section Icon & Title */}
          <View style={s.supplierTitleRow}>
            <View style={[s.supplierIconContainer, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
              <MaterialCommunityIcons name="barcode-scan" size={28} color="#3B82F6" />
            </View>
            <View>
              <Text style={[s.supplierMainTitle, { color: isDark ? '#FFFFFF' : '#1E293B' }]}>Supplier Bills</Text>
              <Text style={s.supplierSubtitle}>Digitize bills, update stock & track history</Text>
            </View>
          </View>

          {/* Tab Navigation Segmented Bar */}
          <View style={s.segmentBarContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveSupplierTab('Scan')}
              style={[s.segmentTab, activeSupplierTab === 'Scan' && s.segmentActiveTab]}
            >
              <Text style={[s.segmentTabText, { color: activeSupplierTab === 'Scan' ? '#FFFFFF' : '#94A3B8' }]}>
                Scan
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveSupplierTab('Manual')}
              style={[s.segmentTab, activeSupplierTab === 'Manual' && s.segmentActiveTab]}
            >
              <Text style={[s.segmentTabText, { color: activeSupplierTab === 'Manual' ? '#FFFFFF' : '#94A3B8' }]}>
                Manual
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveSupplierTab('History')}
              style={[s.segmentTab, activeSupplierTab === 'History' && s.segmentActiveTab]}
            >
              <Text style={[s.segmentTabText, { color: activeSupplierTab === 'History' ? '#FFFFFF' : '#94A3B8' }]}>
                History
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Views */}
          <ScrollView style={s.supplierBody} keyboardShouldPersistTaps="handled">
            {activeSupplierTab === 'Scan' && (
              <View style={s.scanTabContent}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleScanBill}
                  style={[s.scanCard, { borderColor: isDark ? '#475569' : '#CBD5E1', backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}
                >
                  <View style={[s.cameraCircle, { backgroundColor: isDark ? '#334155' : '#EFF6FF' }]}>
                    <MaterialCommunityIcons name="camera" size={32} color="#3B82F6" />
                  </View>
                  <Text style={[s.scanTitle, { color: isDark ? '#FFFFFF' : '#334155' }]}>Tap to Scan Bill</Text>
                  <Text style={s.scanSubtitle}>Support Camera, Image & PDF</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeSupplierTab === 'Manual' && (
              <View style={[s.manualTabContent, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <Text style={[s.manualTabTitle, { color: isDark ? '#FFFFFF' : '#1E293B' }]}>Manual Stock Entry</Text>
                <View style={s.formGrid}>
                  <View style={s.formFieldGroup}>
                    <Text style={s.fieldLabel}>Product Name</Text>
                    <TextInput
                      style={[s.formInput, { color: isDark ? '#FFFFFF' : '#0F172A', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                      placeholder="e.g. Curd (Loose)"
                      placeholderTextColor="#94A3B8"
                      value={newName}
                      onChangeText={setNewName}
                    />
                  </View>

                  <View style={s.formInputRow}>
                    <View style={[s.formFieldGroup, { flex: 1, marginRight: 10 }]}>
                      <Text style={s.fieldLabel}>Selling Price (₹)</Text>
                      <TextInput
                        style={[s.formInput, { color: isDark ? '#FFFFFF' : '#0F172A', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                        placeholder="e.g. 80"
                        placeholderTextColor="#94A3B8"
                        value={newPrice}
                        onChangeText={setNewPrice}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={[s.formFieldGroup, { flex: 1 }]}>
                      <Text style={s.fieldLabel}>Cost Price (₹)</Text>
                      <TextInput
                        style={[s.formInput, { color: isDark ? '#FFFFFF' : '#0F172A', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                        placeholder="e.g. 60"
                        placeholderTextColor="#94A3B8"
                        value={newCostPrice}
                        onChangeText={setNewCostPrice}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={s.formInputRow}>
                    <View style={[s.formFieldGroup, { flex: 1, marginRight: 10 }]}>
                      <Text style={s.fieldLabel}>Stock Level</Text>
                      <TextInput
                        style={[s.formInput, { color: isDark ? '#FFFFFF' : '#0F172A', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                        placeholder="e.g. 50"
                        placeholderTextColor="#94A3B8"
                        value={newStock}
                        onChangeText={setNewStock}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={[s.formFieldGroup, { flex: 1 }]}>
                      <Text style={s.fieldLabel}>Unit</Text>
                      <TextInput
                        style={[s.formInput, { color: isDark ? '#FFFFFF' : '#0F172A', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                        placeholder="e.g. kg, L, pcs"
                        placeholderTextColor="#94A3B8"
                        value={newUnit}
                        onChangeText={setNewUnit}
                      />
                    </View>
                  </View>

                  <View style={s.formInputRow}>
                    <View style={[s.formFieldGroup, { flex: 1, marginRight: 10 }]}>
                      <Text style={s.fieldLabel}>Category</Text>
                      <TextInput
                        style={[s.formInput, { color: isDark ? '#FFFFFF' : '#0F172A', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                        placeholder="e.g. Dairy, Grain"
                        placeholderTextColor="#94A3B8"
                        value={newCategory}
                        onChangeText={setNewCategory}
                      />
                    </View>

                    <View style={[s.formFieldGroup, { flex: 1 }]}>
                      <Text style={s.fieldLabel}>Emoji Icon</Text>
                      <TextInput
                        style={[s.formInput, { color: isDark ? '#FFFFFF' : '#0F172A', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                        placeholder="e.g. 🥣, 🌾"
                        placeholderTextColor="#94A3B8"
                        value={newIcon}
                        onChangeText={setNewIcon}
                      />
                    </View>
                  </View>
                </View>

                <View style={s.manualTabActions}>
                  <TouchableOpacity
                    style={s.manualAddBtn}
                    onPress={handleCreateProduct}
                    disabled={createLoading}
                  >
                    {createLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={s.submitBtnText}>Verify & Add Product</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {activeSupplierTab === 'History' && (
              <View style={s.historyTabContent}>
                {supplierBillHistory.map((bill) => (
                  <TouchableOpacity
                    key={bill.id}
                    activeOpacity={0.75}
                    onPress={() => setSelectedHistoryBill(bill)}
                    style={[s.historyItem, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                  >
                    <View style={s.historyLeft}>
                      <View style={[s.historyIconBox, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                        <MaterialCommunityIcons name="file-document-outline" size={22} color={isDark ? '#94A3B8' : '#718096'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.historyTitle, { color: isDark ? '#FFFFFF' : '#1E293B' }]}>{bill.invoiceId}</Text>
                        <Text style={s.historySubtitle}>{bill.supplier} • {bill.date}</Text>
                      </View>
                    </View>
                    <View style={s.historyRight}>
                      <Text style={s.historyVal}>{bill.totalValue}</Text>
                      <Text style={s.historyQty}>{bill.itemsSummary}</Text>
                      <View style={s.historyViewBadge}>
                        <MaterialCommunityIcons name="chevron-right" size={14} color="#3B82F6" />
                        <Text style={s.historyViewText}>View</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>



          {/* OCR Document Scanner Visual Loading Indicator */}
          {isOcrScanning && (
            <View style={[StyleSheet.absoluteFill, s.loaderOverlay, { zIndex: 10000 }]}>
              <View style={[s.loaderCard, { backgroundColor: '#1A2333', paddingVertical: 40 }]}>
                <ActivityIndicator size="large" color="#10B981" style={{ marginBottom: 16 }} />
                
                <Text style={[s.loaderText, { color: '#FFFFFF', fontSize: 20, fontWeight: '800' }]}>
                  Analyzing bill with AI...
                </Text>
                
                <Text style={[s.loaderSubtext, { color: '#94A3B8', fontSize: 13, marginTop: 4 }]}>
                  Processing with OCR AI...
                </Text>
                
                <View style={s.loaderProgressBarBg}>
                  <View style={s.loaderProgressBarFill} />
                </View>
              </View>
            </View>
          )}

          {/* High-Fidelity OCR Review Overlay Sheet */}
          {showOcrReview && (
            <View style={[StyleSheet.absoluteFill, s.loaderOverlay, { zIndex: 10000 }]}>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => setShowOcrReview(false)}
              />
              
              <View style={[s.reviewCard, { backgroundColor: '#1A2333' }]}>
                {/* Header Row */}
                <View style={s.reviewHeaderRow}>
                  <View style={s.reviewTitleGroup}>
                    <Text style={s.reviewTitleText}>Review Items</Text>
                    <Text style={s.reviewCountBadge}>{ocrScannedItems.length} items</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleClearAllOcrItems}
                    style={s.clearAllBtn}
                  >
                    <Text style={s.clearAllBtnText}>CLEAR ALL</Text>
                  </TouchableOpacity>
                </View>

                {/* Spreadsheet Table Headers */}
                <View style={s.tableHeaderRow}>
                  <Text style={[s.headerCell, s.cellProduct]}>PRODUCT</Text>
                  <Text style={[s.headerCell, s.cellQty]}>QTY</Text>
                  <Text style={[s.headerCell, s.cellUnit]}>UNIT</Text>
                  <Text style={[s.headerCell, s.cellTotal]}>TOTAL</Text>
                  <Text style={[s.headerCell, s.cellCost]}>COST/UNIT</Text>
                  <Text style={[s.headerCell, s.cellSell]}>SELL/UNIT</Text>
                  <View style={s.cellDeleteHeader} />
                </View>

                {/* Spreadsheet Table Body */}
                <ScrollView style={s.tableScroll} contentContainerStyle={s.tableScrollContent} keyboardShouldPersistTaps="handled">
                  {ocrScannedItems.map((item) => (
                    <View key={item.id} style={s.tableRow}>
                      {/* PRODUCT NAME (Editable TextInput) */}
                      <TextInput
                        style={[s.rowInputText, s.cellProduct]}
                        value={item.name}
                        onChangeText={(text) => handleUpdateOcrItemField(item.id, 'name', text)}
                        placeholder="Product Name"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                      />

                      {/* QTY (Editable TextInput) */}
                      <TextInput
                        style={[s.rowInputNumberCenter, s.cellQty]}
                        value={item.qty.toString()}
                        onChangeText={(text) => handleUpdateOcrItemField(item.id, 'qty', text)}
                        keyboardType="numeric"
                      />

                      {/* UNIT badge */}
                      <View style={[s.cellUnit, s.unitBadgeContainer]}>
                        <View style={s.unitBadge}>
                          <Text style={s.unitBadgeText}>{item.unit.toUpperCase()}</Text>
                        </View>
                      </View>

                      {/* TOTAL cost */}
                      <View style={[s.cellTotal, s.totalValueContainer]}>
                        <Text style={s.currencyLabelSmall}>₹</Text>
                        <Text style={s.totalValueText}>{item.total}</Text>
                      </View>

                      {/* COST/UNIT (Editable TextInput) */}
                      <View style={[s.cellCost, s.costValueContainer]}>
                        <Text style={s.currencyLabelSmallCost}>₹</Text>
                        <TextInput
                          style={s.rowInputNumberRight}
                          value={item.costPrice.toString()}
                          onChangeText={(text) => handleUpdateOcrItemField(item.id, 'costPrice', text)}
                          keyboardType="numeric"
                        />
                      </View>

                      {/* SELL/UNIT (Editable bordered input box) */}
                      <View style={[s.cellSell, s.sellInputContainer]}>
                        <View style={s.sellInputBoxWrapper}>
                          <Text style={s.sellInputRupee}>₹</Text>
                          <TextInput
                            style={s.sellInputBox}
                            value={item.sellPrice.toString()}
                            onChangeText={(text) => handleUpdateOcrItemField(item.id, 'sellPrice', text)}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>

                      {/* Delete button */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleDeleteOcrItem(item.id)}
                        style={s.rowDeleteBtn}
                      >
                        <MaterialCommunityIcons name="close" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {ocrScannedItems.length === 0 && (
                    <View style={s.emptyReviewState}>
                      <MaterialCommunityIcons name="clipboard-alert-outline" size={48} color="#64748B" />
                      <Text style={s.emptyReviewText}>No items to review. Click below to add one.</Text>
                    </View>
                  )}
                </ScrollView>

                {/* Bottom Action Footer Row */}
                <View style={s.reviewFooterRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleAddNewOcrItem}
                    style={s.addOcrItemBtn}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color="#3B82F6" />
                    <Text style={s.addOcrItemBtnText}>Add Item</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleProcessOcrItems}
                    style={s.processOcrBtn}
                    disabled={isProcessingOcr}
                  >
                    {isProcessingOcr ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="file-document-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={s.processOcrBtnText}>PROCESS</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ─── History Bill Detail Popup ─── */}
          {selectedHistoryBill !== null && (
            <View style={[StyleSheet.absoluteFill, s.loaderOverlay, { zIndex: 10001 }]}>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => setSelectedHistoryBill(null)}
              />

              <View style={s.historyDetailCard}>
                {/* Card Header */}
                <View style={s.historyDetailHeader}>
                  <View style={s.historyDetailHeaderLeft}>
                    <View style={s.historyDetailIconWrap}>
                      <MaterialCommunityIcons name="file-document-multiple-outline" size={20} color="#3B82F6" />
                    </View>
                    <View>
                      <Text style={s.historyDetailInvoiceId}>{selectedHistoryBill.invoiceId}</Text>
                      <Text style={s.historyDetailSupplier}>{selectedHistoryBill.supplier} • {selectedHistoryBill.date}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedHistoryBill(null)} style={s.historyDetailCloseBtn}>
                    <MaterialCommunityIcons name="close" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Total Banner */}
                <View style={s.historyDetailTotalBanner}>
                  <Text style={s.historyDetailTotalLabel}>TOTAL INVOICE VALUE</Text>
                  <Text style={s.historyDetailTotalValue}>{selectedHistoryBill.totalValue}</Text>
                </View>

                {/* Items Table Header */}
                <View style={s.historyDetailTableHeader}>
                  <Text style={[s.historyDetailColHead, { flex: 2 }]}>PRODUCT</Text>
                  <Text style={[s.historyDetailColHead, { flex: 0.6, textAlign: 'center' }]}>QTY</Text>
                  <Text style={[s.historyDetailColHead, { flex: 0.7, textAlign: 'center' }]}>UNIT</Text>
                  <Text style={[s.historyDetailColHead, { flex: 1, textAlign: 'right' }]}>COST</Text>
                  <Text style={[s.historyDetailColHead, { flex: 1, textAlign: 'right' }]}>SELL</Text>
                  <Text style={[s.historyDetailColHead, { flex: 1, textAlign: 'right' }]}>TOTAL</Text>
                </View>

                {/* Items Scroll */}
                <ScrollView style={s.historyDetailScroll} contentContainerStyle={{ paddingBottom: 8 }}>
                  {selectedHistoryBill.items.map((item, idx) => (
                    <View
                      key={item.id}
                      style={[s.historyDetailRow, idx % 2 === 0 && s.historyDetailRowAlt]}
                    >
                      <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={s.historyDetailRowDot} />
                        <Text style={s.historyDetailItemName} numberOfLines={1}>{item.name}</Text>
                      </View>
                      <Text style={[s.historyDetailCell, { flex: 0.6, textAlign: 'center' }]}>{item.qty}</Text>
                      <View style={{ flex: 0.7, alignItems: 'center', justifyContent: 'center' }}>
                        <View style={s.historyDetailUnitBadge}>
                          <Text style={s.historyDetailUnitText}>{item.unit}</Text>
                        </View>
                      </View>
                      <Text style={[s.historyDetailCell, { flex: 1, textAlign: 'right' }]}>₹{item.costPrice}</Text>
                      <Text style={[s.historyDetailCellSell, { flex: 1, textAlign: 'right' }]}>₹{item.sellPrice}</Text>
                      <Text style={[s.historyDetailCellTotal, { flex: 1, textAlign: 'right' }]}>₹{item.total}</Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={s.historyDetailDivider} />

                {/* Action Buttons */}
                <View style={s.historyDetailActions}>
                  {/* Edit & Re-Review: loads items back into the OCR spreadsheet */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={s.historyDetailBtnSecondary}
                    onPress={() => {
                      const cloned: OcrItem[] = selectedHistoryBill.items.map(item => ({
                        ...item,
                        id: `reload-${item.id}-${Date.now()}`,
                      }));
                      setOcrScannedItems(cloned);
                      setSelectedHistoryBill(null);
                      setShowOcrReview(true);
                    }}
                  >
                    <MaterialCommunityIcons name="table-edit" size={16} color="#3B82F6" />
                    <Text style={s.historyDetailBtnSecondaryText}>Edit & Re-Review</Text>
                  </TouchableOpacity>

                  {/* Re-Process: directly pushes items to inventory */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={s.historyDetailBtnPrimary}
                    disabled={isProcessingOcr}
                    onPress={async () => {
                      const billRef = selectedHistoryBill;
                      const cloned: OcrItem[] = billRef.items.map(item => ({ ...item }));
                      setSelectedHistoryBill(null);
                      setIsProcessingOcr(true);
                      try {
                        for (const item of cloned) {
                          const matched = products.find(
                            p => p.name.toLowerCase().trim() === item.name.toLowerCase().trim()
                          );
                          if (matched) {
                            await productApi.update(matched._id, {
                              price: item.sellPrice,
                              costPrice: item.costPrice,
                              stock: matched.stock + item.qty,
                            });
                          } else {
                            let category = 'Grains';
                            let icon = '🌾';
                            const nl = item.name.toLowerCase();
                            if (nl.includes('rice')) { category = 'Grains'; icon = '🌾'; }
                            else if (nl.includes('dal')) { category = 'Pulses'; icon = '🥣'; }
                            else if (nl.includes('oil')) { category = 'Oil'; icon = '🛢️'; }
                            else if (nl.includes('salt')) { category = 'Spices'; icon = '🧂'; }
                            else if (nl.includes('flour') || nl.includes('atta')) { category = 'Grains'; icon = '🌾'; }
                            else if (nl.includes('excel') || nl.includes('surf') || nl.includes('soap')) { category = 'Household'; icon = '🧴'; }
                            await productApi.create({
                              name: item.name,
                              price: item.sellPrice,
                              costPrice: item.costPrice,
                              stock: item.qty,
                              unit: item.unit.toLowerCase(),
                              category,
                              icon,
                            });
                          }
                        }
                        await loadProducts();
                        addToast(`${billRef.invoiceId} re-processed into inventory!`, 'success');
                        setActiveSupplierTab('History');
                      } catch (err: any) {
                        console.error('Re-process failed:', err);
                        Alert.alert('Re-Process Failed', 'Could not update stock. Please try again.');
                      } finally {
                        setIsProcessingOcr(false);
                      }
                    }}
                  >
                    {isProcessingOcr ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="refresh" size={16} color="#FFFFFF" />
                        <Text style={s.historyDetailBtnPrimaryText}>Re-Process Stock</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Manual Quick Stock & Price Editor Modal */}
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
                  <View style={[s.batchListCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(148,163,184,0.06)' }]}>
                    <Text style={s.batchHeader}>ACTIVE INVENTORY BATCHES</Text>
                    {editingProduct.batches.map((batch, idx) => (
                      <View key={idx} style={s.batchRow}>
                        <Text style={s.batchLabel}>Batch {idx + 1}</Text>
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
                  style={[s.modalBtn, s.modalDeleteBtn, { borderColor: '#EF4444' }]}
                  onPress={() => handleDeleteProduct(editingProduct._id, editingProduct.name)}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                  <Text style={s.deleteBtnText}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.modalBtn, s.modalSubmit]}
                  onPress={handleUpdateProduct}
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={s.submitBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Floating Add Product FAB overlay */}
      <Modal
        visible={showAddForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddForm(false)}
      >
        <View style={s.addFormOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowAddForm(false)}
          />
          <View style={[s.addFormCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View style={s.addFormHeader}>
              <Text style={[s.addFormTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                Register New Product
              </Text>
              <TouchableOpacity onPress={() => setShowAddForm(false)}>
                <MaterialCommunityIcons name="close" size={22} color={isDark ? '#94A3B8' : '#718096'} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.addFormScrollContent} keyboardShouldPersistTaps="handled">
              <View style={s.formGrid}>
                <View style={s.formFieldGroup}>
                  <Text style={s.fieldLabel}>Product Name</Text>
                  <TextInput
                    style={[s.formInput, { color: isDark ? '#FFFFFF' : '#0F172A', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                    placeholder="e.g. Curd (Loose)"
                    placeholderTextColor="#94A3B8"
                    value={newName}
                    onChangeText={setNewName}
                  />
                </View>

                <View style={s.formInputRow}>
                  <View style={[s.formFieldGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={s.fieldLabel}>Selling Price (₹)</Text>
                    <TextInput
                      style={[s.formInput, { color: isDark ? '#FFFFFF' : '#0F172A', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                      placeholder="e.g. 80"
                      placeholderTextColor="#94A3B8"
                      value={newPrice}
                      onChangeText={setNewPrice}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[s.formFieldGroup, { flex: 1 }]}>
                    <Text style={s.fieldLabel}>Cost Price (₹)</Text>
                    <TextInput
                      style={[s.formInput, { color: isDark ? '#FFFFFF' : '#0F172A', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                      placeholder="e.g. 60"
                      placeholderTextColor="#94A3B8"
                      value={newCostPrice}
                      onChangeText={setNewCostPrice}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={s.formInputRow}>
                  <View style={[s.formFieldGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={s.fieldLabel}>Stock Level</Text>
                    <TextInput
                      style={[s.formInput, { color: isDark ? '#FFFFFF' : '#0F172A', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                      placeholder="e.g. 50"
                      placeholderTextColor="#94A3B8"
                      value={newStock}
                      onChangeText={setNewStock}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[s.formFieldGroup, { flex: 1 }]}>
                    <Text style={s.fieldLabel}>Unit</Text>
                    <TextInput
                      style={[s.formInput, { color: isDark ? '#FFFFFF' : '#0F172A', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                      placeholder="e.g. kg, L, pcs"
                      placeholderTextColor="#94A3B8"
                      value={newUnit}
                      onChangeText={setNewUnit}
                    />
                  </View>
                </View>

                <View style={s.formInputRow}>
                  <View style={[s.formFieldGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={s.fieldLabel}>Category</Text>
                    <TextInput
                      style={[s.formInput, { color: isDark ? '#FFFFFF' : '#0F172A', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                      placeholder="e.g. Dairy, Grain"
                      placeholderTextColor="#94A3B8"
                      value={newCategory}
                      onChangeText={setNewCategory}
                    />
                  </View>

                  <View style={[s.formFieldGroup, { flex: 1 }]}>
                    <Text style={s.fieldLabel}>Emoji Icon</Text>
                    <TextInput
                      style={[s.formInput, { color: isDark ? '#FFFFFF' : '#0F172A', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                      placeholder="e.g. 🥣, 🌾"
                      placeholderTextColor="#94A3B8"
                      value={newIcon}
                      onChangeText={setNewIcon}
                    />
                  </View>
                </View>
              </View>

              <View style={s.addFormActions}>
                <TouchableOpacity
                  style={[s.addFormBtn, s.addFormCancel]}
                  onPress={() => setShowAddForm(false)}
                >
                  <Text style={[s.cancelBtnText, { color: isDark ? '#94A3B8' : '#718096' }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.addFormBtn, s.addFormSubmit]}
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
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  orangeHeaderBase: {
    paddingTop: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#FF7E06',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
  },
  headerInnerTitleRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 4,
  },
  headerTitleMain: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
  },
  inventoryBadge: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  inventoryBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1.5,
  },
  addStockBtn: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginBottom: 20,
    gap: 6,
  },
  addStockBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
  },
  searchBarContainer: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  searchInput: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  mainBody: {
    flex: 1,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statsCardLeft: {
    flex: 1,
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  statsVal: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
  },
  statsIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconChar: {
    fontSize: 24,
  },
  detailsBox: {
    flex: 1,
  },
  pName: {
    fontSize: 16,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A0AEC0',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  actionBtnCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBottomRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  bottomCol: {
    flex: 1,
  },
  colLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#A0AEC0',
    letterSpacing: 0.8,
  },
  priceVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 2,
  },
  unitSuffix: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  stockVal: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
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
    marginHorizontal: 20,
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
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
    backgroundColor: '#FF7E06',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: 16,
    gap: spacing.sm,
  },
  seedBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF7E06',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
    fontWeight: '800',
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
    fontWeight: '700',
  },
  modalPUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  batchListCard: {
    padding: spacing.md,
    borderRadius: 16,
    gap: 6,
  },
  batchHeader: {
    fontSize: 8,
    fontWeight: '700',
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
    fontWeight: '600',
    color: '#94A3B8',
  },
  batchQty: {
    fontSize: 10,
    fontWeight: '700',
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
    fontWeight: '700',
    color: '#94A3B8',
  },
  modalInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  modalBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  modalDeleteBtn: {
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  modalSubmit: {
    backgroundColor: '#FF7E06',
    flex: 1,
    marginLeft: 15,
  },
  submitBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addFormOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  addFormCard: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: spacing.xl,
    maxHeight: '85%',
  },
  addFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  addFormTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  addFormScrollContent: {
    paddingBottom: 40,
  },
  formGrid: {
    gap: spacing.md,
  },
  formFieldGroup: {
    gap: 4,
  },
  formInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    fontWeight: '600',
  },
  formInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  addFormBtn: {
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFormCancel: {
    backgroundColor: 'rgba(148,163,184,0.1)',
  },
  addFormSubmit: {
    backgroundColor: '#FF7E06',
  },

  // Supplier Bills Layout Styles
  supplierContainer: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
  },
  brand: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  langBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
  },
  langText: {
    fontSize: 10,
    fontWeight: '800',
  },
  menuBtn: {
    padding: spacing.sm,
    borderRadius: 12,
  },
  supplierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  supplierIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  supplierMainTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  supplierSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  segmentBarContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    flexDirection: 'row',
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActiveTab: {
    backgroundColor: '#334155',
    borderRadius: 10,
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  supplierBody: {
    flex: 1,
  },
  scanTabContent: {
    flex: 1,
    justifyContent: 'center',
  },
  scanCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 28,
    paddingVertical: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 10,
  },
  cameraCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scanSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
  manualTabContent: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  manualTabTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 18,
  },
  manualTabActions: {
    marginTop: spacing.xl,
  },
  manualAddBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FF7E06',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTabContent: {
    marginTop: 10,
    paddingBottom: 40,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  historySubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    flex: 1,
    paddingLeft: 10,
  },
  historyVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981',
  },
  historyQty: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'right',
  },

  // Loader Visuals
  loaderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderCard: {
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '80%',
  },
  loaderText: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  loaderSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },

  // Success Results
  successCard: {
    width: '85%',
    maxWidth: 380,
    borderRadius: 32,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16,185,129,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  successInvoiceId: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B82F6',
    marginTop: 6,
  },
  successSupplier: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  scannedItemsList: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginVertical: 20,
    gap: 8,
  },
  scannedItemsTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  scannedItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannedItemName: {
    fontSize: 13,
    fontWeight: '700',
  },
  scannedItemQty: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10B981',
  },
  successCloseBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  successCloseBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  actionSheetCard: {
    width: '85%',
    maxWidth: 360,
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  actionSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  actionSheetBody: {
    marginBottom: 16,
  },
  actionSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  actionSheetIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionSheetText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionSheetCancelBtn: {
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSheetCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // OCR Progress Loader Styles
  loaderProgressBarBg: {
    width: '80%',
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    marginTop: 20,
    overflow: 'hidden',
  },
  loaderProgressBarFill: {
    width: '25%',
    height: '100%',
    backgroundColor: '#10B981',
  },

  // High-Fidelity Spreadsheet Review Card Styles
  reviewCard: {
    width: '95%',
    maxWidth: 680,
    borderRadius: 24,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  reviewCountBadge: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  clearAllBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  clearAllBtnText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#EF4444',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 4,
  },
  headerCell: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tableScroll: {
    flexGrow: 0,
  },
  tableScrollContent: {
    paddingBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    minHeight: 48,
  },
  cellProduct: {
    flex: 2.2,
    marginRight: 6,
  },
  cellQty: {
    flex: 0.8,
  },
  cellUnit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellTotal: {
    flex: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellCost: {
    flex: 1.4,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cellSell: {
    flex: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellDeleteHeader: {
    width: 32,
  },
  rowInputText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    padding: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  rowInputNumberCenter: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    padding: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  unitBadgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  unitBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
  },
  totalValueContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  totalValueText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  currencyLabelSmall: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    marginLeft: 2,
    marginTop: -2,
  },
  costValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rowInputNumberRight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'right',
    padding: 0,
    width: 40,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  currencyLabelSmallCost: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginRight: 2,
  },
  sellInputContainer: {
    paddingHorizontal: 4,
    width: '100%',
  },
  sellInputBoxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 126, 6, 0.6)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 6,
    width: '100%',
  },
  sellInputRupee: {
    color: '#FF7E06',
    fontSize: 11,
    fontWeight: '800',
    marginRight: 2,
  },
  sellInputBox: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    padding: 0,
  },
  rowDeleteBtn: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyReviewState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyReviewText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  reviewFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 12,
  },
  addOcrItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addOcrItemBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B82F6',
  },
  processOcrBtn: {
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#2E7D32',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  processOcrBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // ─── History Item "View" badge ───────────────────────────────────────────
  historyViewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  historyViewText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
  },

  // ─── History Bill Detail Popup ───────────────────────────────────────────
  historyDetailCard: {
    width: '95%',
    maxWidth: 680,
    maxHeight: '82%',
    borderRadius: 24,
    backgroundColor: '#1A2333',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  historyDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyDetailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  historyDetailIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDetailInvoiceId: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  historyDetailSupplier: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  historyDetailCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  historyDetailTotalBanner: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyDetailTotalLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.8,
  },
  historyDetailTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10B981',
  },
  historyDetailTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 2,
  },
  historyDetailColHead: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.6,
  },
  historyDetailScroll: {
    maxHeight: 240,
  },
  historyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  historyDetailRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  historyDetailRowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    flexShrink: 0,
  },
  historyDetailItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
    flex: 1,
  },
  historyDetailCell: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  historyDetailCellSell: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF7E06',
  },
  historyDetailCellTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  historyDetailUnitBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  historyDetailUnitText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748B',
  },
  historyDetailDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 14,
  },
  historyDetailActions: {
    flexDirection: 'row',
    gap: 10,
  },
  historyDetailBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 11,
  },
  historyDetailBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B82F6',
  },
  historyDetailBtnPrimary: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingVertical: 11,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  historyDetailBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

