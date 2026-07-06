import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const ChatScreen = () => {
  const { user } = useAuthStore();
  const { chats, loading, error, fetchChats } = useChatStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchChats(user.id);
    }
  }, [user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (user?.id) {
      await fetchChats(user.id);
    }
    setRefreshing(false);
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
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              padding: 15,
              borderBottomWidth: 1,
              borderBottomColor: '#eee',
            }}
            onPress={() => {
              // Navigate to chat detail (we would use navigation prop, but for simplicity we skip)
              console.log('Navigate to chat detail', item);
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                <MaterialCommunityIcons name='account-circle' size={30} color='#666' />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold' }}>{item.title}</Text>
                <Text style={{ color: '#666', fontSize: 14 }}>{item.lastMessage}</Text>
              </View>
              <Text style={{ color: '#666', fontSize: 12 }}>{item.lastMessageTime}</Text>
            </View>
          </TouchableOpacity>
        )}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </View>
  );
};
