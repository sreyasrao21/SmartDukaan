import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../services/api';

interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatar?: string;
  defaultVoiceLanguage?: string;
  fallbackVoiceLanguage?: string;
  voiceLanguagePolicy?: 'manual' | 'hybrid' | 'auto';
  enableVoiceLanguageMenu?: boolean;
  supportedVoiceLanguages?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('token');
        if (storedToken) {
          setToken(storedToken);
          const response = await authApi.getMe();
          setUser(response.data);
        }
      } catch {
        try { await SecureStore.deleteItemAsync('token'); } catch {}
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const logout = async () => {
    try { await SecureStore.deleteItemAsync('token'); } catch {}
    setToken(null);
    setUser(null);
  };

  const login = async (newToken: string, newUser: User) => {
    try { await SecureStore.setItemAsync('token', newToken); } catch {}
    setToken(newToken);
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
