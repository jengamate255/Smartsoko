import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { authService } from '@/services/supabase';

export const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await authService.resetPassword(email);
      if (error) throw error;
      Alert.alert('Success', 'Password reset link sent to your email');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Enter your email to receive a reset link</Text>
      
      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      
      <TouchableOpacity style={styles.button} onPress={handleReset} disabled={isLoading}>
        <Text style={styles.buttonText}>{isLoading ? 'Sending...' : 'Send Reset Link'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#012d1d', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16 },
  button: { backgroundColor: '#012d1d', borderRadius: 25, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
