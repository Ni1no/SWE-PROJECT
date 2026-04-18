import { Platform } from 'react-native';

/** Express backend (auth, etc.). */
export function getBackendBaseUrl(): string {
  const u = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (u) return u.replace(/\/$/, '');
  if (Platform.OS === 'android') return 'http://10.0.2.2:5000';
  return 'http://127.0.0.1:5000';
}
