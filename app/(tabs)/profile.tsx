import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          Manage your account settings and information
        </Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>S</Text>
          </View>

          <Text style={styles.name}>Sarah Johnson</Text>
          <Text style={styles.email}>sarah.johnson@email.com</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.rowButton} activeOpacity={0.85}>
            <Text style={styles.rowButtonText}>Edit Profile</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.rowButton} activeOpacity={0.85}>
            <Text style={styles.rowButtonText}>Reset Password</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.rowButton} activeOpacity={0.85}>
            <Text style={styles.rowButtonText}>Notification Settings</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} activeOpacity={0.85}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    alignItems: 'center',
    marginBottom: 18,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563EB',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF3',
  },
  rowButtonText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 22,
    color: '#9CA3AF',
  },
  signOutButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});