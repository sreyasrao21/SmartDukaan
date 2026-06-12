import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

export default function GlobalLanguageModal() {
  const { lang, setLang, showLangPicker, setShowLangPicker, languages, currentLanguage, t } = useLanguage();
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={showLangPicker}
      transparent
      animationType="fade"
      onRequestClose={() => setShowLangPicker(false)}
    >
      <View style={styles.langModalOverlay}>
        <View style={[styles.langModalCard, { backgroundColor: isDark ? '#1A2333' : '#FFFFFF' }]}>
          <View style={styles.langModalHeader}>
            <View style={styles.langModalIconWrap}>
              <MaterialCommunityIcons name="translate" size={24} color="#3B82F6" />
            </View>
            <Text style={[styles.langModalTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
              {t('selectLanguage')}
            </Text>
            <TouchableOpacity onPress={() => setShowLangPicker(false)} style={styles.langModalClose}>
              <MaterialCommunityIcons name="close" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          <View style={styles.langList}>
            {languages.map(l => (
              <TouchableOpacity
                key={l.code}
                style={[
                  styles.langOption,
                  lang === l.code && styles.langOptionActive,
                  { borderColor: isDark ? '#334155' : '#E2E8F0' }
                ]}
                onPress={() => {
                  setLang(l.code);
                  setShowLangPicker(false);
                }}
              >
                <Text style={styles.langFlag}>{l.flag}</Text>
                <View style={styles.langInfo}>
                  <Text style={[styles.langNative, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>{l.name}</Text>
                  <Text style={[styles.langEnglish, { color: isDark ? '#94A3B8' : '#64748B' }]}>{l.label}</Text>
                </View>
                {lang === l.code && (
                  <View style={styles.langCheck}>
                    <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  langModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  langModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  langModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  langModalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  langModalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  langModalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langList: {
    gap: 12,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  langOptionActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderColor: '#3B82F6',
  },
  langFlag: {
    fontSize: 28,
    marginRight: 16,
  },
  langInfo: {
    flex: 1,
  },
  langNative: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  langEnglish: {
    fontSize: 13,
    fontWeight: '500',
  },
  langCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
