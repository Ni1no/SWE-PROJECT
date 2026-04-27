import React, { useMemo } from 'react';
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
import { useAuth } from '../auth-context';

function getUrgencyColor(urgency: string) {
  switch (urgency) {
    case 'overdue':
      return '#EF4444';
    case 'soon':
      return '#F59E0B';
    default:
      return '#22C55E';
  }
}

function getImportanceColor(label: string) {
  switch (label) {
    case 'Critical':
      return '#B91C1C';
    case 'High':
      return '#B45309';
    case 'Medium':
      return '#1D4ED8';
    default:
      return '#374151';
  }
}

export default function DashboardScreen() {
  const router = useRouter();
  const { vehicles, services } = useAppData();
  const { user } = useAuth();

  const onServicePress = (service: string, vehicle: string, dueText: string, serviceId?: string) => {
    const buttons = serviceId
      ? [
          {
            text: 'Open record',
            onPress: () =>
              router.push({
                pathname: '/edit-service',
                params: { id: serviceId },
              }),
          },
          { text: 'Cancel', style: 'cancel' as const },
        ]
      : [{ text: 'OK', style: 'default' as const }];
    Alert.alert(service, `${vehicle}\n${dueText}`, buttons);
  };

  const sortedAdvisorServices = useMemo(() => {
    const order = { overdue: 0, soon: 1, good: 2 } as const;
    return [...vehicles]
      .filter((vehicle) => vehicle.hasMaintenance && !!vehicle.nextService.trim())
      .sort((a, b) => order[a.urgency] - order[b.urgency])
      .map((vehicle) => {
        const matchingRecord = services.find(
          (s) => s.vehicle === vehicle.name && s.service === vehicle.nextService
        );
        return {
          id: matchingRecord?.id,
          service: vehicle.nextService,
          vehicle: vehicle.name,
          dueText: vehicle.dueText,
          urgency: vehicle.urgency,
        };
      });
  }, [vehicles, services]);

  const importanceByVehicle = useMemo(() => {
    const map: Record<string, string> = {};
    vehicles.forEach((v) => {
      map[v.name] = v.advisorImportanceLabel || 'Low';
    });
    return map;
  }, [vehicles]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.welcome}>Welcome back, {user?.name || 'Driver'}!</Text>
        <Text style={styles.subtext}>
          Here&apos;s an overview of your vehicles
        </Text>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Your Vehicles</Text>
        </View>

        {vehicles.length > 0 ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vehicleScroll}
            >
              {vehicles.map((vehicle) => (
                <View key={vehicle.id} style={styles.vehicleCard}>
                  <View style={styles.vehicleTopRow}>
                    <Text style={styles.vehicleName}>{vehicle.name}</Text>
                    <View
                      style={[
                        styles.urgencyDot,
                        { backgroundColor: getUrgencyColor(vehicle.urgency) },
                      ]}
                    />
                  </View>

                  {vehicle.hasMaintenance && vehicle.nextService ? (
                    <>
                      <Text style={styles.cardLabel}>Next Service</Text>
                      <Text style={styles.cardValue}>{vehicle.nextService}</Text>
                      <Text
                        style={[
                          styles.importanceText,
                          { color: getImportanceColor(vehicle.advisorImportanceLabel) },
                        ]}
                      >
                        Importance: {vehicle.advisorImportanceLabel}
                        {vehicle.advisorImportanceScore
                          ? ` (${vehicle.advisorImportanceScore}/100)`
                          : ''}
                      </Text>

                      <Text style={[styles.cardLabel, styles.cardSpacer]}>Due In</Text>
                      <Text
                        style={[
                          styles.dueText,
                          { color: getUrgencyColor(vehicle.urgency) },
                        ]}
                      >
                        {vehicle.dueText}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.cardLabel, styles.cardSpacer]}>
                      No maintenance logged yet.
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>

            <View style={styles.scrollIndicatorRow}>
              <Text style={styles.arrow}>‹</Text>

              <View style={styles.fakeScrollBarTrack}>
                <View style={styles.fakeScrollBarThumb} />
              </View>

              <Text style={styles.arrow}>›</Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyVehiclesCard}>
            <Text style={styles.emptyVehiclesText}>
              No vehicles yet. Tap + to add your first vehicle.
            </Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, styles.servicesTitle]}>
          Upcoming & Overdue Services
        </Text>

        {sortedAdvisorServices.length > 0 ? (
          <View style={styles.serviceList}>
            {sortedAdvisorServices.map((service, index) => (
              <TouchableOpacity
                key={`${service.vehicle}-${service.service}`}
                style={[
                  styles.serviceRow,
                  index !== sortedAdvisorServices.length - 1 &&
                    styles.serviceRowBorder,
                ]}
                activeOpacity={0.8}
                onPress={() =>
                  onServicePress(
                    service.service,
                    service.vehicle,
                    service.dueText,
                    service.id
                  )
                }
              >
                <View
                  style={[
                    styles.serviceDot,
                    {
                      backgroundColor: getUrgencyColor(service.urgency),
                    },
                  ]}
                />
                <View style={styles.serviceTextWrap}>
                  <Text style={styles.serviceTitle}>{service.service}</Text>
                  <Text style={styles.serviceSubtitle}>{service.vehicle}</Text>
                <Text
                  style={[
                    styles.importanceText,
                    {
                      color: getImportanceColor(importanceByVehicle[service.vehicle] || 'Low'),
                    },
                  ]}
                >
                  Importance: {importanceByVehicle[service.vehicle] || 'Low'}
                </Text>
                </View>
                <Text
                  style={[
                    styles.serviceRightText,
                    {
                      color: getUrgencyColor(service.urgency),
                    },
                  ]}
                >
                  {service.dueText}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyServicesCard}>
            <Text style={styles.emptyServicesText}>
              No upcoming or overdue services yet. Tap + to log your first maintenance record.
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 110,
  },
  welcome: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  subtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 22,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  vehicleScroll: {
    paddingRight: 10,
  },
  vehicleCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginRight: 14,
    borderWidth: 1.5,
    borderColor: '#D7E3F4',
  },
  vehicleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  urgencyDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  cardLabel: {
    marginTop: 12,
    fontSize: 12,
    color: '#6B7280',
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardSpacer: {
    marginTop: 14,
  },
  importanceText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  dueText: {
    fontSize: 15,
    fontWeight: '700',
  },
  scrollIndicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  arrow: {
    marginHorizontal: 8,
  },
  fakeScrollBarTrack: {
    width: 150,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 999,
  },
  fakeScrollBarThumb: {
    width: 70,
    height: '100%',
    backgroundColor: '#9CA3AF',
    borderRadius: 999,
  },
  emptyVehiclesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 18,
  },
  emptyVehiclesText: {
    fontSize: 13,
    color: '#6B7280',
  },
  servicesTitle: {
    marginBottom: 14,
  },
  serviceList: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
  },
  emptyServicesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  emptyServicesText: {
    fontSize: 13,
    color: '#6B7280',
  },
  serviceRow: {
    flexDirection: 'row',
    padding: 10,
  },
  serviceRowBorder: {
    borderBottomWidth: 1,
  },
  serviceDot: {
    width: 10,
    height: 10,
    marginRight: 10,
  },
  serviceTextWrap: {
    flex: 1,
  },
  serviceTitle: {
    fontWeight: '600',
  },
  serviceSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  serviceRightText: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    color: 'white',
    fontSize: 28,
  },
});