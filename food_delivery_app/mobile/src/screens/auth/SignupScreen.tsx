/**
 * Signup Screen
 * User registration with role pre-selection
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthNavigationProp, SignupRouteProp, UserRole } from '@/types/navigation';
import { useAuth } from '@/context/AuthContext';
import { validateSignupForm } from '@/utils/validators';

export const SignupScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const route = useRoute<SignupRouteProp>();
  const { signUp } = useAuth();

  const selectedRole = route.params?.role || 'customer';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);

  const handleSignup = async () => {
    // Validate
    const validationErrors = validateSignupForm(email, password, fullName, phone);
    
    if (password !== confirmPassword) {
      validationErrors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      await signUp(email, password, selectedRole as UserRole, fullName, phone);
      Alert.alert(
        'Account Created',
        'Please check your email to verify your account.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Could not create account');
    } finally {
      setIsLoading(false);
    }
  };

  const getFieldError = (field: string) => {
    return errors.find((e) => e.field === field)?.message;
  };

  const roleLabels: Record<string, string> = {
    customer: 'Customer',
    merchant: 'Vendor',
    driver: 'Driver',
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.roleBadge}>As {roleLabels[selectedRole]}</Text>

        {/* Full Name */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, getFieldError('fullName') && styles.inputError]}
            placeholder="John Doe"
            value={fullName}
            onChangeText={setFullName}
            editable={!isLoading}
          />
          {getFieldError('fullName') && (
            <Text style={styles.errorText}>{getFieldError('fullName')}</Text>
          )}
        </View>

        {/* Email */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, getFieldError('email') && styles.inputError]}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
          />
          {getFieldError('email') && (
            <Text style={styles.errorText}>{getFieldError('email')}</Text>
          )}
        </View>

        {/* Phone */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone (optional)</Text>
          <TextInput
            style={[styles.input, getFieldError('phone') && styles.inputError]}
            placeholder="+255 XXX XXX XXX"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={!isLoading}
          />
          {getFieldError('phone') && (
            <Text style={styles.errorText}>{getFieldError('phone')}</Text>
          )}
        </View>

        {/* Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, getFieldError('password') && styles.inputError]}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {getFieldError('password') && (
            <Text style={styles.errorText}>{getFieldError('password')}</Text>
          )}
        </View>

        {/* Confirm Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={[styles.input, getFieldError('confirmPassword') && styles.inputError]}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!isLoading}
          />
          {getFieldError('confirmPassword') && (
            <Text style={styles.errorText}>{getFieldError('confirmPassword')}</Text>
          )}
        </View>

        {/* Signup Button */}
        <TouchableOpacity
          style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
          onPress={handleSignup}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signupButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Change Role */}
        <TouchableOpacity
          style={styles.changeRoleButton}
          onPress={() => navigation.navigate('RoleSelection')}
        >
          <Text style={styles.changeRoleText}>Change account type</Text>
        </TouchableOpacity>

        {/* Sign In Link */}
        <View style={styles.signinContainer}>
          <Text style={styles.signinText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signinLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#012d1d',
    marginBottom: 8,
  },
  roleBadge: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textTransform: 'capitalize',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  signupButton: {
    backgroundColor: '#012d1d',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  changeRoleButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  changeRoleText: {
    color: '#666',
    fontSize: 14,
  },
  signinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signinText: {
    color: '#666',
    fontSize: 14,
  },
  signinLink: {
    color: '#012d1d',
    fontSize: 14,
    fontWeight: '600',
  },
});
