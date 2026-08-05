import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useChatStore } from './chatStore';
import { supabase } from '../services/supabase';

vi.mock('../services/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
      channel: vi.fn(),
      removeChannel: vi.fn(),
    },
  };
});

const mockSupabase = vi.mocked(supabase);

describe('useChatStore', () => {
  let store: ReturnType<typeof useChatStore.getState>;

  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({
      chats: [],
      messages: [],
      loading: false,
      error: null,
    });
    store = useChatStore.getState();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const createMockChain = (overrides = {}) => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      ...overrides,
    };
    return chain;
  };

  const mockFrom = mockSupabase.from;

  const createFetchChatsChain = (result = { data: [], error: null }) => {
    // Handle both resolved value and rejected promise
    const isRejected = result instanceof Promise;
    const orderFn = vi.fn().mockImplementation(() => {
      if (isRejected) {
        return result;
      }
      return Promise.resolve(result);
    });
    const orFn = vi.fn().mockReturnValue({ order: orderFn });
    const selectFn = vi.fn().mockReturnValue({ or: orFn, order: orderFn });
    
    return {
      select: selectFn,
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: orFn,
      order: orderFn,
      single: vi.fn().mockReturnThis(),
    };
  };

  const createFetchMessagesChain = (result = { data: [], error: null }) => {
    const orderFn = vi.fn().mockResolvedValue(result);
    const eqFn = vi.fn().mockReturnValue({ order: orderFn });
    const selectFn = vi.fn().mockReturnValue({ eq: eqFn, order: orderFn });
    
    return {
      select: selectFn,
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: eqFn,
      or: vi.fn().mockReturnThis(),
      order: orderFn,
      single: vi.fn().mockReturnThis(),
    };
  };

  describe('fetchChats', () => {
    it('sets loading to false after fetch', async () => {
      const mockChain = createFetchChatsChain({ data: [], error: null });
      mockFrom.mockReturnValue(mockChain);

      await store.fetchChats('user1');

      const state = useChatStore.getState();
      expect(state.loading).toBe(false);
    });

    it('sets chats on successful fetch', async () => {
      const mockChats = [
        { id: 'chat1', title: 'Chat 1', lastMessage: 'Hello', lastMessageTime: '2024-01-01', user_id: 'user1' },
        { id: 'chat2', title: 'Chat 2', lastMessage: 'Hi', lastMessageTime: '2024-01-02', user_id: 'user2' },
      ];

      const mockChain = createFetchChatsChain({ data: mockChats, error: null });
      mockFrom.mockReturnValue(mockChain);

      await store.fetchChats('user1');

      const state = useChatStore.getState();
      expect(state.chats).toEqual(mockChats);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error on fetch failure', async () => {
      const errorMessage = 'Failed to fetch chats';
      const mockChain = createFetchChatsChain({ data: null, error: { message: errorMessage } });
      mockFrom.mockReturnValue(mockChain);

      await store.fetchChats('user1');

      const state = useChatStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.chats).toEqual([]);
    });

    it('handles exception during fetch', async () => {
      const errorMessage = 'Network error';
      const mockChain = createFetchChatsChain(Promise.reject(new Error(errorMessage)));
      mockFrom.mockReturnValue(mockChain);

      await store.fetchChats('user1');

      const state = useChatStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('fetchMessages', () => {
    it('sets loading to false after fetch', async () => {
      const mockChain = createFetchMessagesChain({ data: [], error: null });
      mockFrom.mockReturnValue(mockChain);

      await store.fetchMessages('chat1');

      const state = useChatStore.getState();
      expect(state.loading).toBe(false);
    });

    it('sets messages on successful fetch', async () => {
      const mockMessages = [
        { id: 'msg1', chat_id: 'chat1', sender_id: 'user1', text: 'Hello', created_at: '2024-01-01' },
        { id: 'msg2', chat_id: 'chat1', sender_id: 'user2', text: 'Hi', created_at: '2024-01-02' },
      ];

      const mockChain = createFetchMessagesChain({ data: mockMessages, error: null });
      mockFrom.mockReturnValue(mockChain);

      await store.fetchMessages('chat1');

      const state = useChatStore.getState();
      expect(state.messages).toEqual(mockMessages);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error on fetch failure', async () => {
      const errorMessage = 'Failed to fetch messages';
      const mockChain = createFetchMessagesChain({ data: null, error: { message: errorMessage } });
      mockFrom.mockReturnValue(mockChain);

      await store.fetchMessages('chat1');

      const state = useChatStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
      expect(state.messages).toEqual([]);
    });
  });

  describe('sendMessage', () => {
    it('sets loading to false after send', async () => {
      const mockChain = createMockChain({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      mockFrom.mockReturnValue(mockChain);

      await store.sendMessage('chat1', 'Hello', 'user1');

      const state = useChatStore.getState();
      expect(state.loading).toBe(false);
    });

    it('adds message to state on successful send', async () => {
      const newMessage = {
        id: 'msg3',
        chat_id: 'chat1',
        sender_id: 'user1',
        text: 'New message',
        created_at: '2024-01-03',
      };

      const mockChain = createMockChain({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newMessage, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      mockFrom.mockReturnValue(mockChain);

      await store.sendMessage('chat1', 'New message', 'user1');

      const state = useChatStore.getState();
      expect(state.messages).toContainEqual(newMessage);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error on send failure', async () => {
      const errorMessage = 'Failed to send message';
      const mockChain = createMockChain({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: errorMessage } }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      mockFrom.mockReturnValue(mockChain);

      await store.sendMessage('chat1', 'Hello', 'user1');

      const state = useChatStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    it('handles exception during send', async () => {
      const errorMessage = 'Network error';
      const mockChain = createMockChain({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error(errorMessage)),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });
      mockFrom.mockReturnValue(mockChain);

      await store.sendMessage('chat1', 'Hello', 'user1');

      const state = useChatStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(errorMessage);
    });

    it('updates chat last message on send', async () => {
      const newMessage = {
        id: 'msg3',
        chat_id: 'chat1',
        sender_id: 'user1',
        text: 'New message',
        created_at: '2024-01-03',
      };

      const eqFn = vi.fn().mockResolvedValue({ error: null });
      const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
      const singleFn = vi.fn().mockResolvedValue({ data: newMessage, error: null });
      const selectFn = vi.fn().mockReturnValue({ single: singleFn });
      const insertFn = vi.fn().mockReturnValue({ select: selectFn });

      const mockChain = {
        insert: insertFn,
        update: updateFn,
        select: selectFn,
        single: singleFn,
        eq: eqFn,
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
      };
      mockFrom.mockReturnValue(mockChain);

      await store.sendMessage('chat1', 'New message', 'user1');

      expect(updateFn).toHaveBeenCalledWith({
        last_message: 'New message',
        last_message_time: expect.any(String),
      });
      expect(eqFn).toHaveBeenCalledWith('id', 'chat1');
    });
  });

  describe('subscribeToMessages', () => {
    it('returns unsubscribe function', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };
      mockSupabase.channel.mockReturnValue(mockChannel);

      const unsubscribe = store.subscribeToMessages('chat1', vi.fn());

      expect(typeof unsubscribe).toBe('function');
      expect(mockSupabase.channel).toHaveBeenCalledWith('messages-chat1');
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('calls callback with new message on subscription event', () => {
      const callback = vi.fn();
      const mockChannel = {
        on: vi.fn((event, filter, handler) => {
          handler({ new: { id: 'msg1', chat_id: 'chat1', text: 'New message' } });
          return mockChannel;
        }),
        subscribe: vi.fn().mockReturnThis(),
      };
      mockSupabase.channel.mockReturnValue(mockChannel);

      store.subscribeToMessages('chat1', callback);

      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'msg1', chat_id: 'chat1', text: 'New message' }),
        ])
      );
    });

    it('cleans up subscription on unsubscribe', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };
      mockSupabase.channel.mockReturnValue(mockChannel);
      mockSupabase.removeChannel.mockImplementation(() => {});

      const unsubscribe = store.subscribeToMessages('chat1', vi.fn());
      unsubscribe();

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useChatStore.getState();
      expect(state.chats).toEqual([]);
      expect(state.messages).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});