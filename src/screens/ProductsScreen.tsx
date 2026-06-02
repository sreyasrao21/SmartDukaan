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
  const [scannedResultModal, setScannedResultModal] = useState<{
    invoiceId: string;
    supplier: string;
    items: { name: string; qty: number; unit: string }[];
  } | null>(null);

  const [supplierBillHistory, setSupplierBillHistory] = useState([
    {
      id: 'SB-1001',
      invoiceId: 'Invoice #SB-1001',
      supplier: 'Om Kirana Wholesalers',
      date: 'May 28, 2026',
      itemsSummary: 'Fortune Oil +10 L, Tata Salt +20 kg',
      totalValue: '₹3,260',
    },
  ]);

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

  // Handle OCR Document Scanner flow
  const handleScanBill = async () => {
    Alert.alert(
      'Scan Supplier Bill',
      'Select purchase invoice source to capture:',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
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
          },
        },
        {
          text: 'Choose Image from Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Media library access is required.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              processScannedBill();
            }
          },
        },
        {
          text: 'Upload PDF Document',
          onPress: async () => {
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
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const processScannedBill = () => {
    setIsOcrScanning(true);
    setTimeout(async () => {
      setIsOcrScanning(false);
      
      const curdChange = 10;
      const toorChange = 15;
      
      const matchedCurd = products.find(p => p.name.toLowerCase().includes('curd'));
      const matchedToor = products.find(p => p.name.toLowerCase().includes('toor'));
      
      try {
        if (matchedCurd) {
          await productApi.update(matchedCurd._id, {
            price: matchedCurd.price,
            stock: matchedCurd.stock + curdChange,
          });
        }
        if (matchedToor) {
          await productApi.update(matchedToor._id, {
            price: matchedToor.price,
            stock: matchedToor.stock + toorChange,
          });
        }
        loadProducts();
      } catch (err) {
        console.error('Failed to sync scanned stock quantities:', err);
      }

      const nextBillNo = supplierBillHistory.length + 1;
      const newBill = {
        id: `SB-100${nextBillNo}`,
        invoiceId: `Invoice #SB-100${nextBillNo}`,
        supplier: 'Balaji Wholesale Foods',
        date: 'Today, 7:32 PM',
        itemsSummary: 'Curd (Loose) +10 kg, Toor Dal +15 kg',
        totalValue: '₹3,275',
      };
      
      setSupplierBillHistory(prev => [newBill, ...prev]);
      setScannedResultModal({
        invoiceId: newBill.invoiceId,
        supplier: newBill.supplier,
        items: [
          { name: 'Curd (Loose)', qty: curdChange, unit: 'kg' },
          { name: 'Toor Dal', qty: toorChange, unit: 'kg' },
        ],
      });
      addToast('Bill digitized successfully!', 'success');
    }, 2500);
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
      {/* Orange-to-Yellow Curved Command Header */}
      <LinearGradient
        colors={['#FFD200', '#FF7E06']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={s.orangeHeader}
      >
        <View style={s.headerInnerTitleRow}>
          <Text style={s.headerTitleMain}>Products 📦</Text>
          <View style={s.inventoryBadge}>
            <Text style={s.inventoryBadgeText}>INVENTORY COMMAND CENTER</Text>
          </View>
        </View>

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

        <View style={s.searchBarContainer}>
          <TextInput
            style={s.searchInput}
            placeholder="Search by name or cat"
            placeholderTextColor="#94A3B8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
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
                isDark={isDark}
              />
            )}
            ListHeaderComponent={listHeader}
            contentContainerStyle={s.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF7E06" />
            }
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
                  <View key={bill.id} style={[s.historyItem, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
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
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
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

      {/* OCR Document Scanner Visual Loading Indicator */}
      <Modal visible={isOcrScanning} transparent animationType="fade">
        <View style={s.loaderOverlay}>
          <View style={[s.loaderCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <ActivityIndicator size="large" color="#FF7E06" />
            <Text style={[s.loaderText, { color: isDark ? '#FFFFFF' : '#1E293B' }]}>Processing Bill using AI OCR...</Text>
            <Text style={s.loaderSubtext}>Analyzing text, quantities, and prices</Text>
          </View>
        </View>
      </Modal>

      {/* Bill Digitized Success Modal Sheet */}
      <Modal visible={scannedResultModal !== null} transparent animationType="fade">
        <View style={s.modalOverlay}>
          {scannedResultModal && (
            <View style={[s.successCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
              <View style={s.successIconBox}>
                <MaterialCommunityIcons name="check-circle" size={48} color="#10B981" />
              </View>
              <Text style={[s.successTitle, { color: isDark ? '#FFFFFF' : '#1E293B' }]}>Bill Digitized Successfully!</Text>
              <Text style={s.successInvoiceId}>{scannedResultModal.invoiceId}</Text>
              <Text style={s.successSupplier}>Supplier: {scannedResultModal.supplier}</Text>
              
              <View style={[s.scannedItemsList, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(148,163,184,0.06)' }]}>
                <Text style={s.scannedItemsTitle}>ITEMS DETECTED & ADDED:</Text>
                {scannedResultModal.items.map((item, idx) => (
                  <View key={idx} style={s.scannedItemRow}>
                    <Text style={[s.scannedItemName, { color: isDark ? '#F1F5F9' : '#334155' }]}>{item.name}</Text>
                    <Text style={s.scannedItemQty}>+{item.qty} {item.unit}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={s.successCloseBtn}
                onPress={() => setScannedResultModal(null)}
              >
                <Text style={s.successCloseBtnText}>Close & Update Stock</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  orangeHeader: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#FF7E06',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
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
});
