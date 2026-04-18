import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getBackendBaseUrl } from './api-config';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token: tokenParam } = useLocalSearchParams<{
    token?: string | string[];
  }>();
  const paramToken = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  const [token, setToken] = useState(paramToken ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (paramToken) setToken(paramToken);
  }, [paramToken]);

  const submit = async () => {
    const t = token.trim();
    if (!t) {
      Alert.alert('Token required', 'Paste the reset token from the email step.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password', 'Use at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getBackendBaseUrl()}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t, newPassword: password }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        Alert.alert('Reset failed', data.message || 'Invalid or expired token.');
        return;
      }
      Alert.alert('Success', data.message || 'Password updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Network error', 'Could not reach the API server.');
    } finally {
      setLoading(false);
      Keyboard.dismiss();
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>New password</Text>
        <Text style={styles.subtitle}>
          Enter the token from your reset email (or from local demo), then choose
          a new password.
        </Text>

        <Text style={styles.label}>Reset token</Text>
        <TextInput
          style={[styles.input, styles.tokenInput]}
          placeholder="Paste token"
          placeholderTextColor="#9CA3AF"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />

        <Text style={styles.label}>New password</Text>
        <TextInput
          style={styles.input}
          placeholder="At least 6 characters"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          style={styles.input}
          placeholder="Repeat password"
          placeholderTextColor="#9CA3AF"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.primary, loading && styles.primaryDisabled]}
          onPress={submit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>Update password</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary} onPress={() => router.back()}>
          <Text style={styles.secondaryText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 32,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 16,
  },
  tokenInput: {
    minHeight: 88,
    paddingTop: 14,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  primary: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  primaryDisabled: { opacity: 0.7 },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  secondary: {
    alignSelf: 'center',
    paddingVertical: 12,
  },
  secondaryText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 15,
  },
});
