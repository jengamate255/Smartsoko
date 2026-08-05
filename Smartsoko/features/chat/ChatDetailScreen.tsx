import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ChatDetailScreenProps {
  // We would get the chat ID from route params
  // For now, we'll use a placeholder or fetch from navigation
}

export const ChatDetailScreen = ({ route }: { route: { params: { chatId: string } } }) => {
  const { user } = useAuthStore();
  const { messages, loading, error, sendMessage, subscribeToMessages } = useChatStore();
  const [messageText, setMessageText] = useState('');
  const [unsubscribe, setUnsubscribe] = useState(() => () => {});

  useEffect(() => {
    const chatId = route.params.chatId;
    
    if (!chatId || !user?.id) return;
    
    // Fetch initial messages
    const fetchInitialMessages = async () => {
      await useChatStore.getState().fetchMessages(chatId);
    };
    
    fetchInitialMessages();
    
    // Set up real-time subscription
    const unsubscribeFn = subscribeToMessages(chatId, (messages) => {
      // Update messages state when new messages arrive
      // Note: In a real implementation, we'd need to update the state properly
      // This is simplified for the example
    });
    
    setUnsubscribe(unsubscribeFn);
    
    // Cleanup on unmount
    return () => {
      unsubscribeFn();
    };
  }, [route.params.chatId, user?.id]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    
    await sendMessage(route.params.chatId, messageText, user.id);
    setMessageText('');
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{
            alignSelf: item.sender_id === user?.id ? 'flex-end' : 'flex-start',
            backgroundColor: item.sender_id === user?.id ? '#ff5a5f' : '#f0f0f0',
            padding: 10,
            borderRadius: 15,
            margin: 8,
            maxWidth: '80%',
          }}>
            <Text style={{ color: item.sender_id === user?.id ? 'white' : 'black' }}>
              {item.text}
            </Text>
          </View>
        )}
      >
      </FlatList>
      <View style={{ flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' }}>
        <TouchableOpacity
          style={{ marginRight: 10 }}
          onPress={() => {
            // In a real app, we would open image picker
            console.log('Attach image');
          }}
        >
          <MaterialCommunityIcons name='paperclip' size={24} color='#666' />
        </TouchableOpacity>
        <TextInput
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, padding: 10 }}
          value={messageText}
          onChangeText={setMessageText}
          placeholder='Type a message...'
        />
        <TouchableOpacity
          onPress={handleSendMessage}
          style={{ backgroundColor: '#ff5a5f', padding: 10, borderRadius: 20, marginLeft: 10 }}
        >
          <MaterialCommunityIcons name='send' size={24} color='white' />
        </TouchableOpacity>
      </View>
    </View>
  );
};
