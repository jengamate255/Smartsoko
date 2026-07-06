/**
 * Auth Context - Global authentication state management
 * Mirrors web app auth logic using Supabase
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '@/services/supabase';
import { Profile, UserRole } from '@/types/models';

interface AuthContextType {
  user: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: UserRole, fullName: string, phone?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    checkUser();

    // Subscribe to auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const authUser = await authService.getCurrentUser();
      if (authUser) {
        await loadUserProfile(authUser.id);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await authService.getProfile(userId);
      setUser(profile);
    } catch (error) {
      console.error('Load profile error:', error);
      setUser(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await authService.signIn(email, password);
    if (error) throw error;
    if (data.user) {
      await loadUserProfile(data.user.id);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    role: UserRole,
    fullName: string,
    phone?: string
  ) => {
    const { data, error } = await authService.signUp(email, password, {
      role,
      fullName,
      phone,
    });
    if (error) throw error;
    // Note: User may need to verify email before signing in
  };

  const signOut = async () => {
    const { error } = await authService.signOut();
    if (error) throw error;
    setUser(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');
    const updated = await authService.updateProfile(user.id, updates);
    setUser(updated);
  };

  const refreshUser = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    role: user?.role || null,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
