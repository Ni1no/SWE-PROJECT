import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppData } from '../data-context';

export default function VehiclesScreen() {
  const router = useRouter();
  const { vehicles, deleteVehicle } = useAppData();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Vehicles</Text>
        <Text style={styles.subtitle}>
          View and manage the vehicles connected to your account
        </Text>

        {vehicles.length > 0 ? (
          vehicles.map((vehicle) => (
            <View key={vehicle.id} style={styles.card}>
              <Text style={styles.vehicleName}>{vehicle.name}</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mileage</Text>
                <Text style={styles.detailValue}>{vehicle.mileage}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>VIN</Text>
                <Text style={styles.detailValue}>{vehicle.vin}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Next Service</Text>
                <Text style={styles.detailValue}>
                  {vehicle.hasMaintenance && vehicle.nextService
                    ? vehicle.nextService
                    : 'No maintenance logged yet'}
                </Text>
              </View>
              {vehicle.hasMaintenance ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Service Importance (CSV-driven)</Text>
                  <Text style={styles.detailValue}>
                    {vehicle.advisorImportanceLabel}
                    {vehicle.advisorImportanceScore
                      ? ` (${vehicle.advisorImportanceScore}/100)`
                      : ''}
                  </Text>
                </View>
              ) : null}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/edit-vehicle',
                      params: { id: vehicle.id },
                    })
                  }
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() =>
                    setConfirmDeleteId((prev) => (prev === vehicle.id ? null : vehicle.id))
                  }
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
              {confirmDeleteId === vehicle.id ? (
                <View style={styles.confirmCard}>
                  <Text style={styles.confirmText}>
                    Are you sure? This also removes maintenance records for {vehicle.name}.
                  </Text>
                  <View style={styles.confirmActions}>
                    <TouchableOpacity
                      style={styles.confirmCancelBtn}
                      onPress={() => setConfirmDeleteId(null)}
                    >
                      <Text style={styles.confirmCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.confirmDeleteBtn}
                      onPress={() => {
                        deleteVehicle(vehicle.id);
                        setConfirmDeleteId(null);
                      }}
                    >
                      <Text style={styles.confirmDeleteText}>Yes, Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No vehicles yet. Tap + to add your first vehicle.
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-vehicle')}
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 14,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  detailRow: {
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  editBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnText: {
    color: '#1D4ED8',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '700',
  },
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
    lineHeight: 18,
    marginBottom: 8,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmCancelBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCancelText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  confirmDeleteBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: '#B91C1C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
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