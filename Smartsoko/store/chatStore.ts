import create from 'zustand';
import { supabase } from '../services/supabase';

export interface Chat {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageTime: string;
  // Additional fields for real implementation
  user_id: string;
  avatar_url?: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  // Additional fields
  sender_name?: string;
  sender_avatar?: string;
}

interface ChatState {
  chats: Chat[];
  messages: Message[];
  loading: boolean;
  error: string | null;
  fetchChats: (userId: string) => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, text: string, senderId: string) => Promise<void>;
  subscribeToMessages: (chatId: string, callback: (messages: Message[]) => void) => () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  messages: [],
  loading: false,
  error: null,

  fetchChats: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      // Fetch chats where the user is a participant
      // This assumes you have a 'chats' or 'conversations' table and a 'participants' table
      // For now, we'll fetch from a simplified view
      const { data, error } = await supabase
        .from('chats_view') // You would create this view or adjust based on your schema
        .select('*')
        .or(user1_id.eq.,user2_id.eq.)
        .order('last_message_time', { ascending: false });

      if (error) throw error;
      set({ chats: data as Chat[], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchMessages: async (chatId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ messages: data as Message[], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  sendMessage: async (chatId: string, text: string, senderId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            chat_id: chatId,
            sender_id: senderId,
            text: text,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Also update the chat's last message
      await supabase
        .from('chats')
        .update({
          last_message: text,
          last_message_time: new Date().toISOString(),
        })
        .eq('id', chatId);

      set((state) => ({
        messages: [...state.messages, data as Message],
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  subscribeToMessages: (chatId: string, callback: (messages: Message[]) => void) => {
    // Set up real-time subscription for messages
    const subscription = supabase
      .channel(messages-)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: chat_id=eq. }, (payload) => {
        set((state) => {
          const newMessage = payload.new as Message;
          callback([...state.messages, newMessage]);
          return { messages: [...state.messages, newMessage] };
        });
      })
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(subscription);
    };
  },
}));

