import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const ProfileScreen = () => {
  const { user, logout } = useAuthStore();

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name='account' size={80} color='#ff5a5f' style={{ alignSelf: 'center', marginVertical: 20 }} />
      <Text style={{ textAlign: 'center', fontSize: 24, marginVertical: 10 }}>
        {user ? user.email : 'Not logged in'}
      </Text>
      <TouchableOpacity
        onPress={logout}
        style={{ backgroundColor: '#ff5a5f', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
