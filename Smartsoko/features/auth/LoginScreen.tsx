import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../services/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { user, error } = await supabase.auth.signIn({ email, password });
      if (error) throw error;
      login(user);
    } catch (err: any) {
      Alert.alert('Login failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <MaterialCommunityIcons name='account' size={80} color='#ff5a5f' style={{ alignSelf: 'center' }} />
      <Text style={{ textAlign: 'center', fontSize: 24, marginVertical: 20 }}>Welcome to Smartsoko</Text>
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
        onPress={handleLogin}
        style={{ backgroundColor: '#ff5a5f', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 }}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size='small' color='white' />
        ) : (
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Login</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={{ marginTop: 10, alignItems: 'center' }}
        onPress={() => {
          // Navigate to register screen (we would use navigation prop, but for simplicity we skip)
          console.log('Navigate to register');
        }}
      >
        <Text>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );
};
