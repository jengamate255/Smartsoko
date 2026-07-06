import create from 'zustand';
import { supabase } from '../services/supabase';

interface AuthState {
  user: any;
  session: any;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false,
  error: null,

  initAuth: async () => {
    set({ loading: true });
    try {
      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: { user } } = await supabase.auth.getUser();
        set({ user, session, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      set({ user: data.user, session: data.session, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  register: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      set({ user: data.user, session: data.session, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  logout: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      set({ user: null, session: null, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
}));

