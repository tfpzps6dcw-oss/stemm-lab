// STEM-148: Added testID props to support Firebase Test Lab Robo script login.
// STEM-152: Dark mode support via ThemeContext. Removed test credentials hint.
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { signIn } from '../services/authService';
import { useTheme } from '../theme/ThemeContext';

export default function LoginScreen({ navigation }) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSignIn() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Sign in</Text>

        <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
        <TextInput
          style={[styles.input, {
            borderColor: theme.border,
            backgroundColor: theme.surface,
            color: theme.text,
          }]}
          placeholder="student@school.edu"
          placeholderTextColor={theme.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          testID="login-email"
        />

        <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
        <TextInput
          style={[styles.input, {
            borderColor: theme.border,
            backgroundColor: theme.surface,
            color: theme.text,
          }]}
          placeholder="••••••••"
          placeholderTextColor={theme.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
          testID="login-password"
        />

        {error && (
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        )}

        <TouchableOpacity
          style={[styles.signInButton, { backgroundColor: theme.primary }, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading}
          testID="login-submit"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.signInButtonText}>Sign in</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.createAccountButton, { borderColor: theme.border }]}
          onPress={() => navigation.navigate('Register')}
          disabled={loading}
        >
          <Text style={[styles.createAccountText, { color: theme.textSecondary }]}>
            Create account
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 32,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  errorText: {
    fontSize: 13,
    marginTop: 12,
  },
  signInButton: {
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  createAccountButton: {
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  createAccountText: {
    fontSize: 14,
  },
});