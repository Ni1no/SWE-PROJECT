import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppData } from '../data-context';
import type { ServiceRecord } from '../data-context';

export default function LogScreen() {
  const router = useRouter();
  const { services, deleteService } = useAppData();

  const onRecordPress = (record: ServiceRecord) => {
    Alert.alert(record.service, `${record.vehicle}\n${record.date} • ${record.mileage}`, [
      {
        text: 'Edit',
        onPress: () =>
          router.push({
            pathname: '/edit-service',
            params: { id: record.id },
          }),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDelete(record),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmDelete = (record: ServiceRecord) => {
    Alert.alert(
      'Delete this record?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteService(record.id),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Maintenance Log</Text>
        <Text style={styles.subtitle}>
          View and manage service history for your vehicles
        </Text>

        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.activeChip}>
            <Text style={styles.activeChipText}>All</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.chip}>
            <Text style={styles.chipText}>Oil</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.chip}>
            <Text style={styles.chipText}>Tires</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.chip}>
            <Text style={styles.chipText}>Brakes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          {services.map((record, index) => (
            <TouchableOpacity
              key={record.id}
              style={[
                styles.recordRow,
                index !== services.length - 1 && styles.recordBorder,
              ]}
              activeOpacity={0.8}
              onPress={() => onRecordPress(record)}
            >
              <View style={styles.iconWrap}>
                <Text style={styles.iconText}>🛠</Text>
              </View>

              <View style={styles.recordTextWrap}>
                <Text style={styles.recordTitle}>{record.service}</Text>
                <Text style={styles.recordVehicle}>{record.vehicle}</Text>
                <Text style={styles.recordMeta}>
                  {record.date} • {record.mileage}
                </Text>
              </View>

              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-service')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
    paddingBottom: 110,
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  activeChip: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginRight: 10,
    marginBottom: 8,
  },
  activeChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  chip: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginRight: 10,
    marginBottom: 8,
  },
  chipText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '500',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  recordBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF3',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  recordTextWrap: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  recordVehicle: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 2,
  },
  recordMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  chevron: {
    fontSize: 22,
    color: '#9CA3AF',
    marginLeft: 10,
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '500',
    marginTop: -2,
  },
});