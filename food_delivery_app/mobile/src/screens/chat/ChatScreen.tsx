import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RootNavigationProp, ChatRouteProp } from '@/types/navigation';
import { chatService } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';
import { ChatMessage } from '@/types/models';
import { formatTime } from '@/utils/formatters';

export const ChatScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<ChatRouteProp>();
  const { orderId, vendorId } = route.params;
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Initialize chat
  useEffect(() => {
    const initChat = async () => {
      try {
        // Get or create chat
        const existingChats = await chatService.getUserChats(user!.id);
        let chat = existingChats.find(
          (c) =>
            (orderId && c.orderId === orderId) ||
            (vendorId && c.participants?.includes(vendorId))
        );

        if (!chat && orderId) {
          chat = await chatService.create({
            orderId,
            participants: [user!.id, vendorId!],
          });
        }

        if (chat) {
          setChatId(chat.id);
          const msgs = await chatService.getMessages(chat.id);
          setMessages(msgs);
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
        Alert.alert('Error', 'Failed to load chat');
      } finally {
        setIsLoading(false);
      }
    };

    initChat();
  }, [orderId, vendorId, user]);

  // Subscribe to new messages
  useEffect(() => {
    if (!chatId) return;

    const subscription = chatService.subscribeToChat(chatId, (newMsg) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.find((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [chatId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !chatId || !user) return;

    try {
      await chatService.sendMessage({
        chatId,
        senderId: user.id,
        senderName: user.full_name || user.email || 'You',
        content: newMessage.trim(),
      });
      setNewMessage('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  }, [newMessage, chatId, user]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === user?.id;

    return (
      <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.otherMessage]}>
        {!isMe && <Text style={styles.senderName}>{item.senderName}</Text>}
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myText : styles.otherText]}>
            {item.content}
          </Text>
        </View>
        <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {orderId ? `Order #${orderId.slice(-6)}` : 'Chat'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>Start the conversation!</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!newMessage.trim()}
        >
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#012d1d',
  },
  backButton: { fontSize: 24, color: '#fff', padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  placeholder: { width: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#666' },
  emptyText: { fontSize: 16, color: '#666' },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 8 },
  messagesList: { padding: 16, paddingBottom: 8 },
  messageContainer: { marginBottom: 16, maxWidth: '80%' },
  myMessage: { alignSelf: 'flex-end' },
  otherMessage: { alignSelf: 'flex-start' },
  senderName: { fontSize: 12, color: '#666', marginBottom: 4, marginLeft: 12 },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  myBubble: { backgroundColor: '#012d1d' },
  otherBubble: { backgroundColor: '#fff' },
  messageText: { fontSize: 14, lineHeight: 20 },
  myText: { color: '#fff' },
  otherText: { color: '#333' },
  timeText: { fontSize: 11, color: '#999', marginTop: 4, alignSelf: 'flex-end' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#012d1d',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: '#ccc' },
  sendButtonText: { color: '#fff', fontSize: 18 },
});
