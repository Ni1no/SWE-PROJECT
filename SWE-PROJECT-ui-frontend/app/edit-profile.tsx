import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './auth-context';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateProfile, deleteProfile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
  }, [user?.name, user?.email]);

  const onSave = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setError('');
    setSaving(true);
    const res = await updateProfile(name, email);
    setSaving(false);
    if (!res.ok) {
      setError(res.message || 'Could not update profile.');
      return;
    }
    router.replace('/(tabs)/profile');
  };

  const onDeleteProfile = async () => {
    setError('');
    setDeleting(true);
    const res = await deleteProfile();
    setDeleting(false);
    if (!res.ok) {
      setError(res.message || 'Could not delete profile.');
      return;
    }
    router.replace('/login');
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Edit Profile</Text>
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TouchableOpacity
          style={[styles.primary, saving && styles.primaryDisabled]}
          onPress={onSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>Save Changes</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.replace('/(tabs)/profile')}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deleteBtn, deleting && styles.primaryDisabled]}
          onPress={() => setConfirmDelete((prev) => !prev)}
          disabled={deleting || saving}
        >
          {deleting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.deleteBtnText}>Delete Profile</Text>
          )}
        </TouchableOpacity>
        {confirmDelete && (
          <View style={styles.confirmCard}>
            <Text style={styles.confirmText}>
              Are you sure? This permanently removes your account.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={onDeleteProfile}
                disabled={deleting}
              >
                <Text style={styles.confirmDeleteText}>Yes, Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6F8' },
  content: { padding: 22 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 20 },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    marginBottom: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 8, marginTop: 8 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
  },
  primary: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  primaryDisabled: {
    opacity: 0.7,
  },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  cancelBtn: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  cancelBtnText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  deleteBtn: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#B91C1C',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  deleteBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  confirmCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
  },
  confirmText: {
    color: '#7F1D1D',
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmCancelBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCancelText: {
    color: '#374151',
    fontWeight: '600',
  },
  confirmDeleteBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#B91C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
