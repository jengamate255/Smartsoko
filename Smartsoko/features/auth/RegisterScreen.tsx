import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const RegisterScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();

  const handleRegister = async () => {
    setLoading(true);
    try {
      await register(email, password);
      const storeError = useAuthStore.getState().error;
      if (storeError) {
        Alert.alert('Registration failed', storeError);
      }
    } catch (err: any) {
      Alert.alert('Registration failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <MaterialCommunityIcons name='account-plus' size={80} color='#ff5a5f' style={{ alignSelf: 'center' }} />
      <Text style={{ textAlign: 'center', fontSize: 24, marginVertical: 20 }}>Register for Smartsoko</Text>
      <TextInput
        placeholder='Email'
        value={email}
        onChangeText={setEmail}
        autoCapitalize='none'
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginVertical: 10 }}
      />
      <TextInput
        placeholder='Password'
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginVertical: 10 }}
      />
      <TouchableOpacity
        onPress={handleRegister}
        style={{ backgroundColor: '#ff5a5f', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 }}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size='small' color='white' />
        ) : (
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Register</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={{ marginTop: 10, alignItems: 'center' }}
        onPress={() => {
          // Navigate to login screen (we would use navigation prop, but for simplicity we skip)
          console.log('Navigate to login');
        }}
      >
        <Text>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
};
