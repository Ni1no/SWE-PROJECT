import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { getBackendBaseUrl } from './api-config';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Email required', 'Enter the email for your account.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getBackendBaseUrl()}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json()) as {
        message?: string;
        resetToken?: string;
        devLocalReset?: boolean;
      };
      if (!res.ok) {
        Alert.alert('Request failed', data.message || 'Try again later.');
        return;
      }
      if (data.devLocalReset && data.resetToken) {
        Alert.alert(
          'Local reset (REQ-16)',
          `${data.message}\n\nContinue to set a new password.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: () =>
                router.replace({
                  pathname: '/reset-password',
                  params: { token: data.resetToken! },
                }),
            },
          ]
        );
      } else {
        Alert.alert('Done', data.message || 'If the account exists, check your email.');
        router.back();
      }
    } catch {
      Alert.alert(
        'Network error',
        'Start the API server (node server.js) and set MONGO_URI, or check EXPO_PUBLIC_API_URL.'
      );
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
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          Enter your account email. In local mode the app shows a reset token
          instead of sending email.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="done"
          onSubmitEditing={submit}
        />

        <TouchableOpacity
          style={[styles.primary, loading && styles.primaryDisabled]}
          onPress={submit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>Send reset link</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary} onPress={() => router.back()}>
          <Text style={styles.secondaryText}>Back</Text>
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
    marginBottom: 20,
  },
  primary: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
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
