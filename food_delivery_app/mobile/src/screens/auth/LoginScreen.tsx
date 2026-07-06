/**
 * Login Screen
 * Mobile adaptation of web login page
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
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '@/types/navigation';
import { useAuth } from '@/context/AuthContext';
import { validateLoginForm } from '@/utils/validators';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);

  const handleLogin = async () => {
    // Validate
    const validationErrors = validateLoginForm(email, password);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      await signIn(email, password);
      // Navigation is handled by auth state change in AppNavigator
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const getFieldError = (field: string) => {
    return errors.find((e) => e.field === field)?.message;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🌿</Text>
          </View>
          <Text style={styles.logoText}>SmartSoko</Text>
          <Text style={styles.tagline}>Your Local. Your Fresh. Your Market.</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.welcomeText}>Welcome back</Text>

          {/* Email Input */}
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

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  getFieldError('password') && styles.inputError,
                ]}
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

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Demo Login */}
          <TouchableOpacity
            style={styles.demoButton}
            onPress={() => {
              setEmail('demo@smartsoko.com');
              setPassword('demo123');
            }}
          >
            <Text style={styles.demoButtonText}>Use Demo Account</Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>New here? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('RoleSelection')}>
              <Text style={styles.signupLink}>Create account</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#c1ecd4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 40,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#012d1d',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#666',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  formSection: {
    width: '100%',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#012d1d',
    marginBottom: 24,
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: '#012d1d',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#012d1d',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e5e5',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  demoButton: {
    borderWidth: 1,
    borderColor: '#012d1d',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#012d1d',
    fontSize: 14,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signupText: {
    color: '#666',
    fontSize: 14,
  },
  signupLink: {
    color: '#012d1d',
    fontSize: 14,
    fontWeight: '600',
  },
});
