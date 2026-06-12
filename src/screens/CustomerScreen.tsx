import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  PanResponder,
  Animated,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';
import { customerApi, ledgerApi } from '../services/api';
import { getKhataStatus } from '../lib/khataLogic';
import { spacing } from '../theme';

interface Customer {
  _id: string;
  name?: string;
  phoneNumber: string;
  khataBalance: number;
  khataScore: number;
  khataLimit: number;
  createdAt: string;
  updatedAt: string;
  lastVisit?: string;
}

interface LedgerEntry {
  _id: string;
  amount: number;
  type: 'debit' | 'credit';
  paymentMode: 'cash' | 'online' | 'ledger';
  status: 'pending' | 'settled';
  createdAt: string;
}

interface CustomerCardItemProps {
  item: Customer;
  onViewDetails: (customer: Customer) => void;
  onSettleDues: (customer: Customer) => void;
  onExplainScore: (info: any) => void;
  formatDate: (date: string) => string;
}

const CustomerCardItem: React.FC<CustomerCardItemProps> = ({
  item,
  onViewDetails,
  onSettleDues,
  onExplainScore,
  formatDate,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 550;
  const { t } = useLanguage();

  const pan = useRef(new Animated.ValueXY()).current;
  const khata = getKhataStatus(item.khataBalance, item.khataScore, item.khataLimit);
  const initial = item.name ? item.name[0].toUpperCase() : 'C';

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Only respond to horizontal swipes (exceeds horizontal threshold, not a scroll)
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 8;
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx > 100) {
          // Swipe Right -> Quick-Call Dialer
          Animated.spring(pan, {
            toValue: { x: 500, y: 0 },
            useNativeDriver: true,
          }).start(() => {
            const phoneUrl = `tel:${item.phoneNumber}`;
            Linking.canOpenURL(phoneUrl).then(supported => {
              if (supported) {
                Linking.openURL(phoneUrl);
              }
            }).catch(() => {});
            
            // Reset position smoothly
            setTimeout(() => {
              Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: true,
              }).start();
            }, 800);
          });
        } else if (gestureState.dx < -100) {
          // Swipe Left -> Quick-Settle Modal
          Animated.spring(pan, {
            toValue: { x: -500, y: 0 },
            useNativeDriver: true,
          }).start(() => {
            onSettleDues(item);
            
            // Reset position smoothly
            setTimeout(() => {
              Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: true,
              }).start();
            }, 800);
          });
        } else {
          // Snap back if threshold not met
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Animate action reveals dynamically
  const callOpacity = pan.x.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const settleOpacity = pan.x.interpolate({
    inputRange: [-80, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const borderCol = item.khataBalance > 1500 ? '#EF4444' : item.khataBalance > 500 ? '#EAB308' : '#10B981';

  return (
    <View style={s.swipeContainer}>
      {/* Background Swipe Actions Drawer */}
      <View style={s.backActionsContainer}>
        {/* Left Side: Call */}
        <Animated.View style={[s.actionLeft, { opacity: callOpacity }]}>
          <MaterialCommunityIcons name="phone-outgoing" size={20} color="#FFFFFF" />
          <Text style={s.actionLeftText}>{isMobile ? 'CALL' : 'CALL CLIENT'}</Text>
        </Animated.View>

        {/* Right Side: Settle */}
        <Animated.View style={[s.actionRight, { opacity: settleOpacity }]}>
          <Text style={s.actionRightText}>{isMobile ? 'SETTLE' : 'SETTLE DUES'}</Text>
          <MaterialCommunityIcons name="currency-inr" size={20} color="#FFFFFF" />
        </Animated.View>
      </View>

      {/* Interactive Card */}
      <Animated.View
        style={{
          transform: [{ translateX: pan.x }],
        }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          style={s.customerCard}
          onPress={() => onViewDetails(item)}
        >
          {isMobile ? (
            /* COMPACT RESPONSIVE LAYOUT FOR MOBILE SCREENS */
            <View>
              {/* TIER 1: Profile & Due Balance */}
              <View style={s.cardTopRowCompact}>
                {/* Profile Section */}
                <View style={s.profileSectionCompact}>
                  <View style={[s.avatarBox, { borderWidth: 2, borderColor: borderCol }]}>
                    <Text style={s.avatarChar}>{initial}</Text>
                  </View>
                  <View style={s.identityTextCompact}>
                    <Text style={s.custName} numberOfLines={1}>
                      {item.name || 'Unnamed Customer'}
                    </Text>
                    <Text style={s.custPhone} numberOfLines={1}>
                      <MaterialCommunityIcons name="phone" size={10} color="#94A3B8" /> {item.phoneNumber}
                    </Text>
                  </View>
                </View>

                {/* Due Balance Section */}
                <View style={s.dueSectionCompact}>
                  <Text style={s.dueTitle}>DUE BALANCE</Text>
                  <View style={s.dueValueRow}>
                    <Text style={s.dueVal}>₹{item.khataBalance}</Text>
                    <View style={[s.indicatorDot, { backgroundColor: borderCol }]} />
                  </View>
                </View>
              </View>

              {/* Divider */}
              <View style={s.cardDivider} />

              {/* TIER 2: Udhaar Score, Last Visit / Limit & Action */}
              <View style={s.cardBottomRowCompact}>
                {/* Score */}
                <View style={s.scoreSectionCompact}>
                  <Text style={s.scoreTitle}>SCORE</Text>
                  <View style={s.scoreBadgeRow}>
                    <View style={[s.scoreBadge, { backgroundColor: item.khataScore >= 800 ? '#10B981' : item.khataScore >= 600 ? '#EAB308' : '#EF4444' }]}>
                      <Text style={s.scoreBadgeVal}>{khata.score}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => onExplainScore({
                        name: item.name || 'Customer',
                        score: item.khataScore,
                        limit: item.khataLimit,
                        balance: item.khataBalance
                      })}
                      style={s.infoBtn}
                    >
                      <MaterialCommunityIcons name="information" size={14} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Compact Activity */}
                <View style={s.activitySectionCompact}>
                  <Text style={s.activityCompactText}>
                    Limit: <Text style={s.whiteBold}>₹{khata.limit}</Text>
                  </Text>
                  <Text style={s.activityCompactTextSecondary}>
                    Visited: {formatDate(item.lastVisit || item.updatedAt)}
                  </Text>
                </View>

                {/* Settle button or indicator */}
                <View style={s.actionSectionCompact}>
                  {item.khataBalance > 0 ? (
                    <TouchableOpacity
                      style={s.settleDuesBtnCompact}
                      onPress={() => onSettleDues(item)}
                    >
                      <Text style={s.settleDuesBtnText}>SETTLE</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={s.settledBadge}>
                      <MaterialCommunityIcons name="check-circle" size={12} color="#10B981" />
                      <Text style={s.settledBadgeText}>SETTLED</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ) : (
            /* WIDE SPACIOUS LAYOUT FOR WEB / TABLET SCREENS */
            <View style={s.cardTopRow}>
              {/* LEFT: Avatar, Name, Phone */}
              <View style={s.profileSection}>
                <View style={[s.avatarBox, { borderWidth: 2, borderColor: borderCol }]}>
                  <Text style={s.avatarChar}>{initial}</Text>
                </View>
                <View style={s.identityText}>
                  <Text style={s.custName} numberOfLines={1}>
                    {item.name || 'Unnamed Customer'}
                  </Text>
                  <Text style={s.custPhone}>
                    <MaterialCommunityIcons name="phone" size={10} color="#94A3B8" /> {item.phoneNumber}
                  </Text>
                </View>
              </View>

              {/* MIDDLE: Udhaar Score */}
              <View style={s.scoreSection}>
                <Text style={s.scoreTitle}>UDHAAR SCORE</Text>
                <View style={s.scoreBadgeRow}>
                  <View style={[s.scoreBadge, { backgroundColor: item.khataScore >= 800 ? '#10B981' : item.khataScore >= 600 ? '#EAB308' : '#EF4444' }]}>
                    <Text style={s.scoreBadgeVal}>{khata.score}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onExplainScore({
                      name: item.name || 'Customer',
                      score: item.khataScore,
                      limit: item.khataLimit,
                      balance: item.khataBalance
                    })}
                    style={s.infoBtn}
                  >
                    <MaterialCommunityIcons name="information" size={14} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* MIDDLE-RIGHT: Due Balance */}
              <View style={s.dueSection}>
                <Text style={s.dueTitle}>DUE BALANCE</Text>
                <View style={s.dueValueRow}>
                  <Text style={s.dueVal}>₹{item.khataBalance}</Text>
                  <View style={[s.indicatorDot, { backgroundColor: borderCol }]} />
                </View>
              </View>

              {/* RIGHT: Activity logs & Settle */}
              <View style={s.actionSection}>
                <View style={s.activityLogs}>
                  <View style={s.logItem}>
                    <MaterialCommunityIcons name="history" size={11} color="#10B981" />
                    <Text style={s.logLabel}>Activity Log</Text>
                  </View>
                  <View style={s.logItem}>
                    <MaterialCommunityIcons name="calendar" size={11} color="#F97316" />
                    <Text style={s.logVal}>{formatDate(item.lastVisit || item.updatedAt)}</Text>
                  </View>
                  <View style={s.logItem}>
                    <MaterialCommunityIcons name="trending-up" size={11} color="#F97316" />
                    <Text style={s.logVal}>Limit: ₹{khata.limit}</Text>
                  </View>
                </View>
                
                {item.khataBalance > 0 && (
                  <TouchableOpacity
                    style={s.settleDuesBtn}
                    onPress={() => onSettleDues(item)}
                  >
                    <Text style={s.settleDuesBtnText}>SETTLE DUES</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default function CustomerScreen() {
  const { isDark } = useTheme();
  const { addToast } = useToast();
  const { t } = useLanguage();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Registration Form
  const [showForm, setShowForm] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // Credit health Logic Explainer Modal
  const [selectedExplainer, setSelectedExplainer] = useState<{
    name: string;
    score: number;
    limit: number;
    balance: number;
  } | null>(null);

  // Repayment Settle Modal
  const [selectedSettleCustomer, setSelectedSettleCustomer] = useState<Customer | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMode, setSettleMode] = useState<'cash' | 'online'>('cash');
  const [settleLoading, setSettleLoading] = useState(false);

  const handleAmountChange = (text: string) => {
    if (!selectedSettleCustomer) return;
    
    // 1. Remove non-numeric characters (restrict entirely to integers)
    const cleanText = text.replace(/[^0-9]/g, '');
    
    if (cleanText === '') {
      setSettleAmount('');
      return;
    }
    
    const amountVal = parseInt(cleanText, 10);
    const maxVal = Math.floor(selectedSettleCustomer.khataBalance);
    
    if (amountVal > maxVal) {
      // 2. Cap at the outstanding dues limit
      setSettleAmount(maxVal.toString());
    } else {
      setSettleAmount(amountVal.toString());
    }
  };

  // Profile History Drawer
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txFilter, setTxFilter] = useState<'all' | 'khata' | 'settlement' | 'instant'>('all');

  const loadCustomers = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const response = await customerApi.getAll();
      setCustomers(response.data);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
      addToast('Failed to fetch customers list', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadCustomers(true);
  }, [loadCustomers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  const handleRegisterCustomer = async () => {
    if (!registerPhone || registerPhone.length !== 10) {
      Alert.alert('Invalid Phone', 'Please provide a valid 10-digit phone number');
      return;
    }

    setRegisterLoading(true);
    try {
      await customerApi.create({
        name: registerName || undefined,
        phoneNumber: registerPhone,
      });
      addToast('Customer registered successfully!', 'success');
      setRegisterName('');
      setRegisterPhone('');
      setShowForm(false);
      loadCustomers();
    } catch (err: any) {
      console.error('Registration failed:', err);
      addToast(err?.response?.data?.message || 'Failed to register customer', 'error');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleSeedCustomers = async () => {
    setLoading(true);
    try {
      await customerApi.seed();
      addToast('Demo customers seeded successfully!', 'success');
      loadCustomers();
    } catch (err: any) {
      console.error('Seeding failed:', err);
      addToast('Failed to seed demo data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCustomerDetails = async (customer: Customer) => {
    setViewingCustomer(customer);
    setTransactions([]);
    setTxLoading(true);
    try {
      const response = await ledgerApi.getCustomerLedger(customer._id);
      setTransactions(response.data);
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
      addToast('Failed to fetch ledger statements', 'error');
    } finally {
      setTxLoading(false);
    }
  };

  const handleSettlePayment = async () => {
    if (!selectedSettleCustomer) return;
    const amountNum = parseFloat(settleAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please provide a positive settlement amount');
      return;
    }

    setSettleLoading(true);
    try {
      await ledgerApi.recordPayment({
        customerId: selectedSettleCustomer._id,
        amount: amountNum,
        paymentMode: settleMode,
      });

      addToast('Payment recorded successfully!', 'success');
      setSelectedSettleCustomer(null);
      setSettleAmount('');
      
      await loadCustomers();
      
      if (viewingCustomer && viewingCustomer._id === selectedSettleCustomer._id) {
        const freshCust = customers.find(c => c._id === selectedSettleCustomer._id);
        if (freshCust) {
          const updatedCust = { ...freshCust, khataBalance: Math.max(0, freshCust.khataBalance - amountNum) };
          setViewingCustomer(updatedCust);
        }
        setTxLoading(true);
        const txResp = await ledgerApi.getCustomerLedger(selectedSettleCustomer._id);
        setTransactions(txResp.data);
        setTxLoading(false);
      }
    } catch (err: any) {
      console.error('Settlement failed:', err);
      addToast('Failed to record settlement payment', 'error');
    } finally {
      setSettleLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchName = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchPhone = c.phoneNumber.includes(searchTerm);
      return matchName || matchPhone;
    });
  }, [customers, searchTerm]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '31 Jan 2026'; // Match seed placeholder mock in screenshot
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // High-Fidelity swipeable card rendering
  const renderCustomerItem = ({ item }: { item: Customer }) => {
    return (
      <CustomerCardItem
        item={item}
        onViewDetails={handleViewCustomerDetails}
        onSettleDues={(cust) => {
          setSelectedSettleCustomer(cust);
          setSettleAmount(Math.floor(cust.khataBalance).toString());
        }}
        onExplainScore={(info) => {
          setSelectedExplainer(info);
        }}
        formatDate={formatDate}
      />
    );
  };

  return (
    <View style={[s.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      {/* High-Fidelity Orange/Yellow Header */}
      <View style={s.gradientHeader}>
        <View style={s.headerInner}>
          <View>
            <Text style={s.title}>{t('navCustomers')}</Text>
            <View style={s.subtitleContainer}>
              <Text style={s.subtitle}>NETWORK RELATIONSHIP MANAGER</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={s.toggleFormBtn}
            onPress={() => setShowForm(!showForm)}
          >
            <MaterialCommunityIcons name={showForm ? 'close' : 'account-plus'} size={22} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Search Bar pill overlapping the bottom */}
        <View style={s.searchWrap}>
          <View style={s.searchBar}>
            <TextInput
              style={s.searchInput}
              placeholder={t('searchCustomers')}
              placeholderTextColor="#94A3B8"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>
        </View>
      </View>

      {/* Main Customers List Wrapper */}
      <KeyboardAvoidingView
        style={s.listWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {showForm && (
          <View style={s.formCard}>
            <Text style={s.formTitle}>{t('addCustomer')}</Text>
            <View style={s.formFields}>
              <TextInput
                style={s.formInput}
                placeholder="Full Name (Optional)"
                placeholderTextColor="#94A3B8"
                value={registerName}
                onChangeText={setRegisterName}
              />
              <TextInput
                style={s.formInput}
                placeholder="10-Digit Mobile Number"
                placeholderTextColor="#94A3B8"
                value={registerPhone}
                onChangeText={t => setRegisterPhone(t.replace(/\D/g, ''))}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            <View style={s.formActions}>
              <TouchableOpacity
                style={[s.formBtn, s.cancelBtn]}
                onPress={() => setShowForm(false)}
              >
                <Text style={s.cancelBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.formBtn, s.submitBtn]}
                onPress={handleRegisterCustomer}
                disabled={registerLoading}
              >
                {registerLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={s.submitBtnText}>Verify & Register</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#FF6B00" />
            <Text style={s.loadingText}>Loading Customers...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredCustomers}
            keyExtractor={item => item._id}
            renderItem={renderCustomerItem}
            contentContainerStyle={s.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF6B00" />
            }
            ListEmptyComponent={
              <View style={s.emptyState}>
                <MaterialCommunityIcons name="account-search-outline" size={64} color="#94A3B8" />
                <Text style={s.emptyTitle}>No customer data yet</Text>
                <Text style={s.emptyDesc}>Generate mock data or register a client above to begin tracking dues.</Text>
                <TouchableOpacity
                  style={s.seedBtn}
                  onPress={handleSeedCustomers}
                >
                  <MaterialCommunityIcons name="database-import" size={18} color="#FFFFFF" />
                  <Text style={s.seedBtnText}>Generate Demo Data</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>

      {/* Explainer Modal */}
      <Modal
        visible={selectedExplainer !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedExplainer(null)}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setSelectedExplainer(null)}
          />
          {selectedExplainer && (
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Credit Health</Text>
                <TouchableOpacity onPress={() => setSelectedExplainer(null)}>
                  <MaterialCommunityIcons name="close" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={s.explainerBody}>
                <Text style={s.explainerSubtitle}>Why this score for {selectedExplainer.name}?</Text>
                
                <View style={s.scoreBigBox}>
                  <Text style={s.scoreBigVal}>{selectedExplainer.score}</Text>
                  <Text style={s.scoreBigLabel}>CURRENT RATING</Text>
                </View>

                <View style={s.breakdownCard}>
                  <View style={s.breakdownRow}>
                    <MaterialCommunityIcons name="shield-check" size={18} color="#10B981" />
                    <View style={s.breakdownInfo}>
                      <Text style={s.breakdownTitle}>Credit Limit</Text>
                      <Text style={s.breakdownVal}>₹{selectedExplainer.limit}</Text>
                    </View>
                  </View>

                  <View style={s.reasonsList}>
                    <Text style={s.reasonsHeader}>LOGIC REASONS</Text>
                    {getKhataStatus(selectedExplainer.balance, selectedExplainer.score, selectedExplainer.limit).reasons.map((r, idx) => (
                      <View key={idx} style={s.reasonRow}>
                        <Text style={s.bullet}>●</Text>
                        <Text style={s.reasonText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <Text style={s.explainerFooter}>BEHAVIOR-BASED CALCULATION • OFFLINE VERIFIED</Text>
              </View>

              <TouchableOpacity
                style={s.modalOkBtn}
                onPress={() => setSelectedExplainer(null)}
              >
                <Text style={s.modalOkBtnText}>GOT IT</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>



      {/* Customer Drawer Modal */}
      <Modal
        visible={viewingCustomer !== null}
        animationType="slide"
        onRequestClose={() => setViewingCustomer(null)}
      >
        <View style={s.drawerContainer}>
          {viewingCustomer && (
            <>
              {/* Profile Header */}
              <View style={s.drawerHeader}>
                <View style={s.drawerHeaderTop}>
                  <View style={s.drawerProfile}>
                    <View style={s.avatarCircleLarge}>
                      <Text style={s.avatarTextLarge}>
                        {(viewingCustomer.name || viewingCustomer.phoneNumber)?.[0]?.toUpperCase() || 'C'}
                      </Text>
                    </View>
                    <View>
                      <Text style={s.drawerCustName}>
                        {viewingCustomer.name || 'Unnamed Customer'}
                      </Text>
                      <Text style={s.drawerCustPhone}>📞 {viewingCustomer.phoneNumber}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setViewingCustomer(null)} style={s.closeDrawerBtn}>
                    <MaterialCommunityIcons name="close-circle" size={28} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Stats Grid */}
                <View style={s.drawerStatsRow}>
                  <View style={s.drawerStatBox}>
                    <Text style={s.drawerStatLabel}>UDHAAR SCORE</Text>
                    <Text style={s.drawerStatValGreen}>{viewingCustomer.khataScore || 600}</Text>
                  </View>
                  <View style={s.drawerStatBox}>
                    <Text style={s.drawerStatLabel}>DUE BALANCE</Text>
                    <Text style={s.drawerStatValRed}>₹{viewingCustomer.khataBalance}</Text>
                  </View>
                </View>
              </View>

              {/* Ledger Activity logs */}
              <View style={s.drawerBody}>
                <View style={s.drawerSubHeader}>
                  <Text style={s.drawerSubTitle}>Activity Log</Text>
                  {viewingCustomer.khataBalance > 0 && (
                    <TouchableOpacity
                      style={s.drawerSettleBtn}
                      onPress={() => {
                        setSelectedSettleCustomer(viewingCustomer);
                        setSettleAmount(Math.floor(viewingCustomer.khataBalance).toString());
                      }}
                    >
                      <Text style={s.drawerSettleBtnText}>Settle Dues</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Filter Tabs */}
                <View style={s.filterTabsScrollWrap}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.filtersRowContent}
                  >
                    {(['all', 'khata', 'settlement', 'instant'] as const).map(tab => {
                      const isActive = txFilter === tab;
                      const labels = {
                        all: 'All',
                        khata: 'Udhaar Debt',
                        settlement: 'Settlements',
                        instant: 'Cash/UPI Sale',
                      };
                      return (
                        <TouchableOpacity
                          key={tab}
                          onPress={() => setTxFilter(tab)}
                          style={[
                            s.filterChip,
                            isActive
                              ? { backgroundColor: '#10B981' }
                              : { backgroundColor: '#E2E8F0' }
                          ]}
                        >
                          <Text style={[s.filterChipText, { color: isActive ? '#FFFFFF' : '#475569' }]}>
                            {labels[tab]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Ledger Listing */}
                {txLoading ? (
                  <View style={s.center}>
                    <ActivityIndicator size="large" color="#FF6B00" />
                    <Text style={s.loadingText}>Retrieving Ledger...</Text>
                  </View>
                ) : (
                  <ScrollView
                    contentContainerStyle={s.ledgerScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    {transactions
                      .filter(tx => {
                        if (txFilter === 'all') return true;
                        if (txFilter === 'khata') return tx.type === 'debit' && tx.paymentMode === 'ledger';
                        if (txFilter === 'settlement') return tx.type === 'credit';
                        if (txFilter === 'instant') return tx.type === 'debit' && tx.paymentMode !== 'ledger';
                        return true;
                      })
                      .map((tx, idx) => {
                        const isCredit = tx.type === 'credit';
                        const isKhata = tx.paymentMode === 'ledger';
                        
                        let cardBg = '#FFFFFF';
                        let icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] = 'package-variant';
                        let iconBg = '#F1F5F9';
                        let iconColor = '#64748B';
                        let label = 'Purchase';
                        let amountColor = '#0F172A';
                        let subLabel = 'Total Bill';

                        if (isCredit) {
                          cardBg = '#F0FDF4';
                          icon = 'cash-multiple';
                          iconBg = '#10B981';
                          iconColor = '#FFFFFF';
                          label = 'Repayment';
                          amountColor = '#16A34A';
                          subLabel = 'Dues Settled';
                        } else if (isKhata) {
                          cardBg = '#FFF7ED';
                          icon = 'trending-down';
                          iconBg = '#F97316';
                          iconColor = '#FFFFFF';
                          label = 'Udhaar Added';
                          amountColor = '#EA580C';
                          subLabel = 'Added to Debt';
                        } else {
                          cardBg = '#EFF6FF';
                          icon = 'check-circle';
                          iconBg = '#2563EB';
                          iconColor = '#FFFFFF';
                          label = 'Instant Paid';
                          amountColor = '#2563EB';
                          subLabel = 'Cash/UPI Sale';
                        }

                        return (
                          <View
                            key={tx._id || idx.toString()}
                            style={[s.ledgerCard, { backgroundColor: cardBg }]}
                          >
                            <View style={s.row}>
                              <View style={[s.ledgerIconBox, { backgroundColor: iconBg }]}>
                                <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
                              </View>
                              <View style={s.ledgerInfoCol}>
                                <View style={s.row}>
                                  <Text style={s.ledgerLabel}>{label}</Text>
                                  <Text style={[s.paymentBadge, { backgroundColor: tx.paymentMode === 'cash' ? '#FFE4E6' : tx.paymentMode === 'online' ? '#F3E8FF' : '#DBEAFE', color: tx.paymentMode === 'cash' ? '#DC2626' : tx.paymentMode === 'online' ? '#6B21A8' : '#1E40AF' }]}>
                                    {tx.paymentMode.toUpperCase()}
                                  </Text>
                                </View>
                                <Text style={s.ledgerTime}>{formatDate(tx.createdAt)}</Text>
                              </View>
                            </View>

                            <View style={s.ledgerAmtCol}>
                              <Text style={[s.ledgerAmt, { color: amountColor }]}>
                                {isCredit ? '-' : '+'}₹{tx.amount}
                              </Text>
                              <Text style={s.ledgerSubLabel}>{subLabel}</Text>
                            </View>
                          </View>
                        );
                      })}
                    {transactions.length === 0 && (
                      <View style={s.emptyLedger}>
                        <MaterialCommunityIcons name="history" size={40} color="#94A3B8" />
                        <Text style={s.emptyLedgerText}>No Activity Logs Available</Text>
                      </View>
                    )}
                  </ScrollView>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Settle Modal */}
      <Modal
        visible={selectedSettleCustomer !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSettleCustomer(null)}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setSelectedSettleCustomer(null)}
          />
          {selectedSettleCustomer && (
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Record Payment</Text>
                <TouchableOpacity onPress={() => setSelectedSettleCustomer(null)}>
                  <MaterialCommunityIcons name="close" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={s.settleBody}>
                <Text style={s.settleSubtitle}>Clear Udhaar for {selectedSettleCustomer.name || 'Customer'}</Text>
                
                <View style={s.amountInputWrap}>
                  <Text style={s.currencyPrefix}>₹</Text>
                  <TextInput
                    style={s.amountInput}
                    keyboardType="numeric"
                    value={settleAmount}
                    onChangeText={handleAmountChange}
                    autoFocus
                  />
                </View>
                <Text style={s.dueBalanceWarning}>Total Dues: ₹{selectedSettleCustomer.khataBalance}</Text>

                <View style={s.settleModeRow}>
                  <TouchableOpacity
                    style={[s.settleModeBtn, settleMode === 'cash' && { backgroundColor: '#10B981', borderColor: '#10B981' }]}
                    onPress={() => setSettleMode('cash')}
                  >
                    <Text style={[s.settleModeText, settleMode === 'cash' && { color: '#FFFFFF' }]}>Cash</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.settleModeBtn, settleMode === 'online' && { backgroundColor: '#7C3AED', borderColor: '#7C3AED' }]}
                    onPress={() => setSettleMode('online')}
                  >
                    <Text style={[s.settleModeText, settleMode === 'online' && { color: '#FFFFFF' }]}>UPI / Online</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[s.modalOkBtn, { backgroundColor: '#10B981' }, settleLoading && { opacity: 0.6 }]}
                  onPress={handleSettlePayment}
                  disabled={settleLoading}
                >
                  {settleLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View style={s.row}>
                      <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
                      <Text style={s.modalOkBtnText}>  Record Payment</Text>
                    </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center' },
  gradientHeader: {
    paddingTop: 50,
    backgroundColor: '#FFB300', // Yellow-orange gradient start
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingBottom: spacing.xxl,
    zIndex: 10,
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: { fontSize: 32, fontWeight: '900', color: '#000000', letterSpacing: -0.8 },
  subtitleContainer: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  subtitle: { fontSize: 9, fontWeight: '900', color: 'rgba(0,0,0,0.65)', letterSpacing: 0.6 },
  toggleFormBtn: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    position: 'absolute',
    bottom: -24,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
    justifyContent: 'center',
  },
  searchInput: { fontSize: 14, fontWeight: '700', color: '#000000' },
  listWrap: { flex: 1, paddingTop: 32 },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 160 },
  swipeContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  backActionsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },
  actionLeft: {
    flex: 1,
    height: '100%',
    backgroundColor: '#10B981', // Green for Call
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 24,
    gap: 8,
  },
  actionLeftText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  actionRight: {
    flex: 1,
    height: '100%',
    backgroundColor: '#F97316', // Orange for Settle
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 24,
    gap: 8,
  },
  actionRightText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  customerCard: {
    backgroundColor: '#1E293B', // Slate dark blue
    borderRadius: 28,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.5,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarChar: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  identityText: { marginLeft: spacing.md, flex: 1 },
  custName: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  custPhone: { fontSize: 12, color: '#94A3B8', fontWeight: '700', marginTop: 4 },
  
  scoreSection: {
    alignItems: 'center',
    flex: 1,
  },
  scoreTitle: { fontSize: 8, fontWeight: '900', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 4 },
  scoreBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreBadge: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scoreBadgeVal: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' },
  infoBtn: { padding: 2 },

  dueSection: {
    alignItems: 'center',
    flex: 1,
  },
  dueTitle: { fontSize: 8, fontWeight: '900', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 4 },
  dueValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dueVal: { fontSize: 20, fontWeight: '900', color: '#F97316' },
  indicatorDot: { width: 8, height: 8, borderRadius: 4 },

  actionSection: {
    alignItems: 'flex-end',
    flex: 1.2,
    gap: 8,
  },
  activityLogs: {
    alignItems: 'flex-end',
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  logLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8' },
  logVal: { fontSize: 9, fontWeight: '700', color: '#94A3B8' },
  settleDuesBtn: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  settleDuesBtnText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  formCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A', marginBottom: spacing.md },
  formFields: { gap: spacing.sm },
  formInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  formBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#F1F5F9' },
  cancelBtnText: { color: '#475569', fontSize: 12, fontWeight: '900' },
  submitBtn: { backgroundColor: '#10B981' },
  submitBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  loadingText: { fontSize: 13, fontWeight: '700', marginTop: spacing.md, color: '#475569' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    marginTop: spacing.xl,
  },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginTop: spacing.md },
  emptyDesc: { fontSize: 12, color: '#64748B', fontWeight: '500', textAlign: 'center', marginTop: 4, paddingHorizontal: spacing.lg },
  seedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    marginTop: spacing.lg,
  },
  seedBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: spacing.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  explainerBody: { alignItems: 'center', paddingVertical: spacing.md },
  explainerSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '800', marginBottom: spacing.md },
  scoreBigBox: { alignItems: 'center', marginVertical: spacing.md },
  scoreBigVal: { fontSize: 44, fontWeight: '900', color: '#10B981', letterSpacing: -1 },
  scoreBigLabel: { fontSize: 8, fontWeight: '900', color: '#64748B', letterSpacing: 1 },
  breakdownCard: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    padding: spacing.md,
    marginTop: spacing.md,
  },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  breakdownInfo: { flex: 1 },
  breakdownTitle: { fontSize: 12, fontWeight: '900', color: '#0F172A' },
  breakdownVal: { fontSize: 15, fontWeight: '900', color: '#10B981', marginTop: 2 },
  reasonsList: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: spacing.md },
  reasonsHeader: { fontSize: 9, fontWeight: '900', color: '#64748B', letterSpacing: 0.5, marginBottom: spacing.sm },
  reasonRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  bullet: { color: '#10B981', fontSize: 12 },
  reasonText: { fontSize: 11, fontWeight: '700', color: '#334155', flex: 1 },
  explainerFooter: { fontSize: 7, fontWeight: '900', color: '#94A3B8', letterSpacing: 0.5, marginTop: spacing.lg },
  modalOkBtn: {
    width: '100%',
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  modalOkBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  settleBody: { paddingVertical: spacing.md, alignItems: 'center' },
  settleSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '800', marginBottom: spacing.md },
  amountInputWrap: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#10B981', paddingBottom: 4 },
  currencyPrefix: { fontSize: 24, fontWeight: '900', color: '#94A3B8', marginRight: 4 },
  amountInput: { fontSize: 32, fontWeight: '900', color: '#0F172A', minWidth: 100, textAlign: 'center' },
  dueBalanceWarning: { fontSize: 11, color: '#EF4444', fontWeight: '800', marginTop: spacing.sm },
  settleModeRow: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.lg, width: '100%' },
  settleModeBtn: { flex: 1, paddingVertical: 12, borderWidth: 2, borderColor: '#F1F5F9', borderRadius: 14, alignItems: 'center' },
  settleModeText: { fontSize: 12, color: '#64748B', fontWeight: '800' },
  drawerContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  drawerHeader: {
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  drawerHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  drawerProfile: { flexDirection: 'row', alignItems: 'center' },
  avatarCircleLarge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextLarge: { fontSize: 22, fontWeight: '900', color: '#16A34A' },
  drawerCustName: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  drawerCustPhone: { fontSize: 12, color: '#64748B', fontWeight: '700', marginTop: 2 },
  closeDrawerBtn: { padding: 4 },
  drawerStatsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  drawerStatBox: { flex: 1, padding: spacing.md, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  drawerStatLabel: { fontSize: 8, fontWeight: '900', color: '#64748B' },
  drawerStatValGreen: { fontSize: 20, fontWeight: '900', color: '#16A34A', marginTop: 2 },
  drawerStatValRed: { fontSize: 20, fontWeight: '900', color: '#DC2626', marginTop: 2 },
  drawerBody: { flex: 1, padding: spacing.lg },
  drawerSubHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  drawerSubTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  drawerSettleBtn: { backgroundColor: '#10B981', paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 10 },
  drawerSettleBtnText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  filterTabsScrollWrap: { maxHeight: 42, marginBottom: spacing.md },
  filtersRowContent: { gap: spacing.sm, paddingRight: spacing.xxl },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 10 },
  filterChipText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  ledgerScroll: { gap: spacing.sm, paddingBottom: spacing.xxl },
  ledgerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: spacing.md,
  },
  ledgerIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  ledgerInfoCol: { marginLeft: spacing.md, flex: 1 },
  ledgerLabel: { fontSize: 13, fontWeight: '900', color: '#0F172A' },
  paymentBadge: { fontSize: 7, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginLeft: 6, textTransform: 'uppercase' },
  ledgerTime: { fontSize: 9, color: '#94A3B8', fontWeight: '700', marginTop: 2 },
  ledgerAmtCol: { alignItems: 'flex-end', marginLeft: spacing.md },
  ledgerAmt: { fontSize: 16, fontWeight: '900' },
  ledgerSubLabel: { fontSize: 8, fontWeight: '900', color: '#94A3B8', marginTop: 2 },
  emptyLedger: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyLedgerText: { fontSize: 12, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  
  cardTopRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileSectionCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.5,
  },
  identityTextCompact: {
    marginLeft: spacing.md,
    flex: 1,
  },
  dueSectionCompact: {
    alignItems: 'flex-end',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#334155', // Slate divider
    marginVertical: spacing.md,
    opacity: 0.3,
  },
  cardBottomRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreSectionCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  activitySectionCompact: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  activityCompactText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
  },
  whiteBold: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  activityCompactTextSecondary: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  actionSectionCompact: {
    alignItems: 'flex-end',
  },
  settleDuesBtnCompact: {
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  settledBadgeText: {
    fontSize: 9,
    color: '#10B981',
    fontWeight: '900',
  },
});
