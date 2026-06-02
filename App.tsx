import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import { fontSize, spacing } from './src/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardHeader() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [language, setLanguage] = useState('en');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'hi' : prev === 'hi' ? 'te' : 'en');
  };

  const navLinks: { path: string; label: string; icon: IconName }[] = [
    { path: 'BillingTab', label: 'Billing', icon: 'store' },
    { path: 'ProductsTab', label: 'Products', icon: 'package' },
    { path: 'CustomersTab', label: 'Customers', icon: 'account-group' },
    { path: 'RecoveryTab', label: 'Recovery Agent', icon: 'phone' },
    { path: 'RecordsTab', label: 'Records', icon: 'book-open-variant' },
    { path: 'KhataTab', label: 'Udhaar', icon: 'credit-card' },
    { path: 'DealsTab', label: 'Group Buy', icon: 'gift' },
    { path: 'AnalyticsTab', label: 'Analytics', icon: 'trending-up' },
    { path: 'GSTTab', label: 'GST & ITR', icon: 'bank' },
    { path: 'WhatsAppTab', label: 'WhatsApp Desk', icon: 'message' },
  ];

  const confirmLogout = () => {
    setShowMenu(false);
    setShowLogoutConfirm(false);
    logout();
  };

  const headerBg = isDark ? '#0A0A0A' : '#FFFFFF';
  const headerBorder = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

  return (
    <View>
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
        <View style={styles.headerInner}>
          <TouchableOpacity style={[styles.avatarBtn, { borderColor: 'rgba(76,175,80,0.3)' }]}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{user?.name?.[0] || 'S'}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.brand, { color: colors.text }]}>SDukaan</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={toggleLanguage} style={[styles.langBtn, { borderColor: colors.border }]}>
              <Text style={[styles.langText, { color: colors.textSecondary }]}>{language.toUpperCase()}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowMenu(true)} style={[styles.menuBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              <MaterialCommunityIcons name="menu" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuModal, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.menuHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.menuTitle, { color: colors.textSecondary }]}>Menu</Text>
              <TouchableOpacity onPress={() => setShowMenu(false)}>
                <MaterialCommunityIcons name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.menuList}>
              {navLinks.slice(4).map((link) => (
                <TouchableOpacity key={link.path} style={styles.menuItem} onPress={() => setShowMenu(false)}>
                  <MaterialCommunityIcons name={link.icon} size={18} color={colors.textSecondary} />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>{link.label}</Text>
                </TouchableOpacity>
              ))}
              {/* Theme Toggle */}
              <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
                <MaterialCommunityIcons name={isDark ? 'weather-sunny' : 'weather-night'} size={18} color={colors.textSecondary} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>{isDark ? 'Light Mode' : 'Dark Mode'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, { marginTop: spacing.xs }]}
                onPress={() => { setShowMenu(false); setShowLogoutConfirm(true); }}
              >
                <MaterialCommunityIcons name="logout" size={18} color="#EF4444" />
                <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Sign Out</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutConfirm} transparent animationType="fade" onRequestClose={() => setShowLogoutConfirm(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowLogoutConfirm(false)}>
          <View style={[styles.logoutModal, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.logoutIcon}>
              <MaterialCommunityIcons name="logout" size={36} color="#EF4444" />
            </View>
            <Text style={[styles.logoutTitle, { color: colors.text }]}>Ready to leave?</Text>
            <Text style={[styles.logoutSubtitle, { color: colors.textSecondary }]}>
              Log out from <Text style={{ fontWeight: '900', color: colors.text }}>SDukaan</Text>?
            </Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
              <Text style={styles.logoutBtnText}>Sign Out Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]} onPress={() => setShowLogoutConfirm(false)}>
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Stay Logged In</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function PlaceholderScreen({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.placeholder, { backgroundColor: colors.background }]}>
      <MaterialCommunityIcons name="hammer-wrench" size={48} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>{label || 'Coming Soon'}</Text>
    </View>
  );
}

function HomeTabs() {
  const { colors, isDark } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DashboardHeader />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: 24,
            left: 24,
            right: 24,
            height: 64,
            backgroundColor: isDark ? 'rgba(17,17,17,0.85)' : 'rgba(255,255,255,0.85)',
            borderTopWidth: 0,
            borderRadius: 32,
            paddingBottom: 0,
            paddingTop: 8,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: isDark ? 0.5 : 0.1,
            shadowRadius: 25,
            elevation: 15,
          },
          tabBarActiveTintColor: '#4CAF50',
          tabBarInactiveTintColor: isDark ? '#6B7280' : '#9CA3AF',
          tabBarShowLabel: false,
        }}
      >
        <Tab.Screen
          name="BillingTab"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
                <MaterialCommunityIcons name="store" size={22} color={color} />
                {focused && <View style={styles.tabDot} />}
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="ProductsTab"
          component={() => <PlaceholderScreen label="Products" />}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
                <MaterialCommunityIcons name="package" size={22} color={color} />
                {focused && <View style={styles.tabDot} />}
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="CustomersTab"
          component={() => <PlaceholderScreen label="Customers" />}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
                <MaterialCommunityIcons name="account-group" size={22} color={color} />
                {focused && <View style={styles.tabDot} />}
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="RecoveryTab"
          component={() => <PlaceholderScreen label="Recovery Agent" />}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
                <MaterialCommunityIcons name="phone" size={22} color={color} />
                {focused && <View style={styles.tabDot} />}
              </View>
            ),
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={HomeTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 50,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  headerInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  avatarBtn: {
    width: 32, height: 32, borderRadius: 16, overflow: 'hidden', borderWidth: 2,
  },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    width: '100%', height: '100%',
    backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 10, fontWeight: '900', color: '#fff' },
  brand: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  langBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 12, borderWidth: 1 },
  langText: { fontSize: 10, fontWeight: '800' },
  menuBtn: { padding: spacing.sm, borderRadius: 12 },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingTop: 100, paddingRight: 16,
  },
  menuModal: {
    width: 256, borderRadius: 24, overflow: 'hidden', borderWidth: 1,
  },
  menuHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg, borderBottomWidth: 1,
  },
  menuTitle: { fontSize: fontSize.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  menuList: { padding: spacing.sm, maxHeight: 300 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: 12,
  },
  menuItemText: { fontSize: fontSize.sm, fontWeight: '500' },
  logoutModal: {
    width: '85%', maxWidth: 340, borderRadius: 40, padding: spacing.xxl, alignItems: 'center', borderWidth: 1,
  },
  logoutIcon: {
    width: 80, height: 80, backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  logoutTitle: { fontSize: 22, fontWeight: '900', marginBottom: spacing.sm },
  logoutSubtitle: { fontSize: fontSize.sm, fontWeight: '500', textAlign: 'center', marginBottom: spacing.xxl },
  logoutBtn: {
    width: '100%', backgroundColor: '#DC2626', borderRadius: 16,
    paddingVertical: spacing.lg, alignItems: 'center', marginBottom: spacing.sm,
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 5,
  },
  logoutBtnText: { fontSize: fontSize.sm, fontWeight: '900', color: '#fff' },
  cancelBtn: { width: '100%', borderRadius: 16, paddingVertical: spacing.lg, alignItems: 'center' },
  cancelBtnText: { fontSize: fontSize.sm, fontWeight: '700' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIconWrap: { alignItems: 'center', justifyContent: 'center' },
  tabIconActive: { transform: [{ scale: 1.1 }] },
  tabDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50', marginTop: 2 },
});
