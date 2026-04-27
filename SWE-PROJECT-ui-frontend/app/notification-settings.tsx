import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';

export default function NotificationSettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [dueSoonEnabled, setDueSoonEnabled] = useState(true);
  const [overdueEnabled, setOverdueEnabled] = useState(true);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Notification Settings</Text>
        <Text style={styles.subtitle}>Configure reminder behavior for maintenance alerts.</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Enable push notifications</Text>
          <Switch value={pushEnabled} onValueChange={setPushEnabled} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Due-soon reminders</Text>
          <Switch value={dueSoonEnabled} onValueChange={setDueSoonEnabled} disabled={!pushEnabled} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Overdue reminders</Text>
          <Switch value={overdueEnabled} onValueChange={setOverdueEnabled} disabled={!pushEnabled} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6F8' },
  content: { padding: 22 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  label: { fontSize: 15, color: '#111827', fontWeight: '500' },
});
