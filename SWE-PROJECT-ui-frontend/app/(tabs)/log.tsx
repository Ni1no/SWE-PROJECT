import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppData } from '../data-context';
import type { ServiceRecord } from '../data-context';

export default function LogScreen() {
  const router = useRouter();
  const { services, deleteService } = useAppData();
  const [activeFilter, setActiveFilter] = useState<'all' | 'oil' | 'tires' | 'brakes'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredServices = useMemo(() => {
    if (activeFilter === 'all') return services;
    const keywordByFilter = {
      oil: ['oil'],
      tires: ['tire', 'tyre', 'rotation', 'wheel'],
      brakes: ['brake'],
    } as const;
    const keys = keywordByFilter[activeFilter];
    return services.filter((r) => {
      const s = r.service.toLowerCase();
      return keys.some((k) => s.includes(k));
    });
  }, [services, activeFilter]);

  const onRecordPress = (record: ServiceRecord) => {
    setExpandedId((prev) => (prev === record.id ? null : record.id));
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
          <TouchableOpacity
            style={activeFilter === 'all' ? styles.activeChip : styles.chip}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={activeFilter === 'all' ? styles.activeChipText : styles.chipText}>All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={activeFilter === 'oil' ? styles.activeChip : styles.chip}
            onPress={() => setActiveFilter('oil')}
          >
            <Text style={activeFilter === 'oil' ? styles.activeChipText : styles.chipText}>Oil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={activeFilter === 'tires' ? styles.activeChip : styles.chip}
            onPress={() => setActiveFilter('tires')}
          >
            <Text style={activeFilter === 'tires' ? styles.activeChipText : styles.chipText}>Tires</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={activeFilter === 'brakes' ? styles.activeChip : styles.chip}
            onPress={() => setActiveFilter('brakes')}
          >
            <Text style={activeFilter === 'brakes' ? styles.activeChipText : styles.chipText}>
              Brakes
            </Text>
          </TouchableOpacity>
        </View>

        {filteredServices.length > 0 ? (
          <View style={styles.listCard}>
            {filteredServices.map((record, index) => (
              <View key={record.id}>
                <TouchableOpacity
                  style={[
                    styles.recordRow,
                    index !== filteredServices.length - 1 && styles.recordBorder,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => onRecordPress(record)}
                  onLongPress={() => confirmDelete(record)}
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

                  <Text style={styles.chevron}>{expandedId === record.id ? '⌄' : '›'}</Text>
                </TouchableOpacity>

                {expandedId === record.id && (
                  <View style={styles.expandedBox}>
                    <Text style={styles.expandedLabel}>Service Details</Text>
                    <Text style={styles.expandedText}>Type: {record.service}</Text>
                    <Text style={styles.expandedText}>Vehicle: {record.vehicle}</Text>
                    <Text style={styles.expandedText}>Date: {record.date}</Text>
                    <Text style={styles.expandedText}>Mileage: {record.mileage}</Text>
                    <Text style={styles.expandedText}>
                      Notes: {record.notes?.trim() ? record.notes : 'No notes added'}
                    </Text>

                    <View style={styles.expandedActions}>
                      <TouchableOpacity
                        style={styles.expandedEditBtn}
                        onPress={() =>
                          router.push({
                            pathname: '/edit-service',
                            params: { id: record.id },
                          })
                        }
                      >
                        <Text style={styles.expandedEditText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.expandedDeleteBtn}
                        onPress={() => confirmDelete(record)}
                      >
                        <Text style={styles.expandedDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No maintenance records yet. Tap + to log your first service.
            </Text>
          </View>
        )}
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
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
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
  expandedBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 10,
    padding: 12,
  },
  expandedLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  expandedText: {
    fontSize: 13,
    color: '#1F2937',
    marginBottom: 4,
  },
  expandedActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  expandedEditBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedEditText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  expandedDeleteBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedDeleteText: {
    color: '#B91C1C',
    fontWeight: '700',
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