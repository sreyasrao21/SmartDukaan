import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, fontSize as fs } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { authApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function AuthScreen() {
  const { colors, isDark } = useTheme();
  const { login } = useAuth();
  const { addToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    phoneNumber: '',
  });

  const handleManualAuth = async () => {
    setLoading(true);
    try {
      const response = isLogin
        ? await authApi.login({ username: formData.username, password: formData.password })
        : await authApi.register(formData);

      await login(response.data.token, response.data.user);
      addToast(`Welcome back, ${response.data.user.name}!`, 'success');
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    addToast('Google login coming soon on mobile', 'info');
  };

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: isDark ? '#111827' : '#F3F4F6' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Background Decorative Elements */}
        <View style={[s.bgCircle1, { backgroundColor: 'rgba(46,125,50,0.1)' }]} />
        <View style={[s.bgCircle2, { backgroundColor: 'rgba(59,130,246,0.1)' }]} />

        <View style={[s.card, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: isDark ? '#374151' : '#F3F4F6' }]}>
          {/* Logo */}
          <View style={s.logoWrap}>
            <Image
              source={require('../assets/logo.jpg')}
              style={s.logo}
              resizeMode="cover"
            />
          </View>
          <Text style={[s.title, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            {isLogin ? 'Welcome Back Shopkeeper' : 'Join as a Shop Owner'}
          </Text>
          <Text style={[s.subtitle, { color: isDark ? '#D1D5DB' : '#4B5563' }]}>
            Manage your Smart Dukaan with ease
          </Text>

          {/* Tab Switcher */}
          <View style={[s.tabRow, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
            <TouchableOpacity
              onPress={() => setIsLogin(true)}
              style={[s.tab, isLogin && { backgroundColor: isDark ? '#4B5563' : '#FFFFFF' }]}
            >
              <Text style={[s.tabText, { color: isLogin ? (isDark ? '#FFFFFF' : '#000000') : (isDark ? '#9CA3AF' : '#6B7280') }]}>
                Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsLogin(false)}
              style={[s.tab, !isLogin && { backgroundColor: isDark ? '#4B5563' : '#FFFFFF' }]}
            >
              <Text style={[s.tabText, { color: !isLogin ? (isDark ? '#FFFFFF' : '#000000') : (isDark ? '#9CA3AF' : '#6B7280') }]}>
                Register
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={s.form}>
            {!isLogin && (
              <View style={[s.inputGroup, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor: isDark ? '#374151' : '#F3F4F6' }]}>
                <MaterialCommunityIcons name="account" size={18} color={isDark ? '#D1D5DB' : '#4B5563'} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: isDark ? '#FFFFFF' : '#111827' }]}
                  placeholder="Full Name"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                  value={formData.name}
                  onChangeText={(t) => setFormData({ ...formData, name: t })}
                />
              </View>
            )}
            {!isLogin && (
              <View style={[s.inputGroup, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor: isDark ? '#374151' : '#F3F4F6' }]}>
                <MaterialCommunityIcons name="email-outline" size={18} color={isDark ? '#D1D5DB' : '#4B5563'} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: isDark ? '#FFFFFF' : '#111827' }]}
                  placeholder="Email Address"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                  value={formData.email}
                  onChangeText={(t) => setFormData({ ...formData, email: t })}
                  keyboardType="email-address"
                />
              </View>
            )}
            {!isLogin && (
              <View style={[s.inputGroup, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor: isDark ? '#374151' : '#F3F4F6' }]}>
                <MaterialCommunityIcons name="phone" size={18} color={isDark ? '#D1D5DB' : '#4B5563'} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: isDark ? '#FFFFFF' : '#111827' }]}
                  placeholder="Phone Number"
                  placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                  value={formData.phoneNumber}
                  onChangeText={(t) => setFormData({ ...formData, phoneNumber: t })}
                  keyboardType="phone-pad"
                />
              </View>
            )}
            <View style={[s.inputGroup, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor: isDark ? '#374151' : '#F3F4F6' }]}>
              <MaterialCommunityIcons name="account" size={18} color={isDark ? '#D1D5DB' : '#4B5563'} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: isDark ? '#FFFFFF' : '#111827' }]}
                placeholder="Username"
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                value={formData.username}
                onChangeText={(t) => setFormData({ ...formData, username: t })}
                autoCapitalize="none"
              />
            </View>
            <View style={[s.inputGroup, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor: isDark ? '#374151' : '#F3F4F6' }]}>
              <MaterialCommunityIcons name="lock" size={18} color={isDark ? '#D1D5DB' : '#4B5563'} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: isDark ? '#FFFFFF' : '#111827' }]}
                placeholder="Password"
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                value={formData.password}
                onChangeText={(t) => setFormData({ ...formData, password: t })}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: isDark ? '#FFFFFF' : '#111111' }, loading && { opacity: 0.6 }]}
              onPress={handleManualAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={isDark ? '#111111' : '#FFFFFF'} />
              ) : (
                <View style={s.submitInner}>
                  <Text style={[s.submitText, { color: isDark ? '#111111' : '#FFFFFF' }]}>
                    {isLogin ? 'Login Now' : 'Create Account'}
                  </Text>
                  <MaterialCommunityIcons name="arrow-right" size={18} color={isDark ? '#111111' : '#FFFFFF'} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* OR divider */}
          <View style={s.divider}>
            <View style={[s.dividerLine, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]} />
            <Text style={[s.dividerText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>OR CONTINUE WITH</Text>
            <View style={[s.dividerLine, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]} />
          </View>

          {/* Google Sign-In Button */}
          <TouchableOpacity
            onPress={handleGoogleLogin}
            style={[s.googleBtn, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: isDark ? '#374151' : '#F3F4F6' }]}
          >
            <Image
              source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }}
              style={s.googleIconImg}
              resizeMode="contain"
            />
            <Text style={[s.googleText, { color: isDark ? '#FFFFFF' : '#111827' }]}>Sign in with Google</Text>
          </TouchableOpacity>

          {/* Terms */}
          <Text style={[s.terms, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            By continuing, you agree to SDukaan's{' '}
            <Text style={[s.termsLink, { color: isDark ? '#FFFFFF' : '#111827' }]}>Terms of Service</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    position: 'relative',
  },
  bgCircle1: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: '40%',
    height: '40%',
    borderRadius: 999,
  },
  bgCircle2: {
    position: 'absolute',
    bottom: '-10%',
    right: '-10%',
    width: '40%',
    height: '40%',
    borderRadius: 999,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 40,
    padding: spacing.xxl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 15,
    alignItems: 'center',
  },
  logoWrap: {
    width: 80,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  logo: { width: '100%', height: '100%' },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  subtitle: { fontSize: fs.md, fontWeight: '500', marginBottom: spacing.xxl },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    width: '100%',
    marginBottom: spacing.xxl,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabText: { fontSize: fs.sm, fontWeight: '700' },
  form: { width: '100%', gap: spacing.md },
  inputGroup: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingLeft: 48,
  },
  inputIcon: { position: 'absolute', left: spacing.lg },
  input: { flex: 1, paddingVertical: 16, paddingRight: 16, fontSize: fs.md },
  submitBtn: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    marginTop: spacing.xs,
  },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  submitText: { fontSize: fs.md, fontWeight: '700' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: spacing.xxl,
    gap: spacing.md,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: fs.xs, fontWeight: '800', letterSpacing: 1 },
  googleBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: spacing.xl,
  },
  googleIconImg: { width: 20, height: 20 },
  googleText: { fontSize: fs.sm, fontWeight: '700' },
  terms: { fontSize: fs.xs, fontWeight: '500', textAlign: 'center' },
  termsLink: { fontWeight: '800', textDecorationLine: 'underline' },
});
