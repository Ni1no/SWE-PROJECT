import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './auth-context';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const onLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Enter email and password.');
      return;
    }
    setError('');
    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);
    if (!res.ok) {
      setError(res.message || 'Login failed. Try again.');
      return;
    }
    router.replace('/(tabs)');
  };

  const onCreateAccount = () => {
    router.push('/register');
  };

  const onForgotPassword = () => {
    router.push('/forgot-password');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="always">
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue using EZ Car Maintenance.</Text>
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor="#9CA3AF"
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity style={[styles.primary, loading && styles.disabled]} onPress={onLogin}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Log In</Text>}
        </TouchableOpacity>
        <Pressable style={styles.linkBtn} onPress={onCreateAccount} hitSlop={12}>
          <Text style={styles.linkText}>Create account</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={onForgotPassword} hitSlop={12}>
          <Text style={styles.linkText}>Forgot password</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6F8' },
  content: { paddingHorizontal: 22, paddingTop: 40, paddingBottom: 30 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    marginBottom: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 14,
  },
  primary: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  disabled: { opacity: 0.7 },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  linkBtn: { alignSelf: 'center', paddingVertical: 10, marginTop: 8 },
  linkText: { color: '#2563EB', fontWeight: '600', fontSize: 15 },
});
