import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useAppData } from '../data-context';
import { fetchAdvisorPatchForVehicle, isAdvisorReachable } from '../advisor-client';
import { getServiceIntervalMiles } from '../reminder-utils';
import { useAuth } from '../auth-context';

function parseMileageValue(mileage: string): number {
  return Number(String(mileage).replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
}

export default function AIAssistantScreen() {
  const { vehicles, services } = useAppData();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [selectedVehicleIdx, setSelectedVehicleIdx] = useState(0);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const selectedVehicle = useMemo(
    () => vehicles[selectedVehicleIdx] ?? null,
    [vehicles, selectedVehicleIdx]
  );
  const selectedVehicleName = selectedVehicle?.name ?? 'No vehicle selected';
  const [messages, setMessages] = useState<
    Array<{ id: string; from: 'user' | 'ai'; text: string; chip?: string }>
  >([]);
  const [advisorConnected, setAdvisorConnected] = useState<boolean | null>(null);

  useEffect(() => {
    isAdvisorReachable().then(setAdvisorConnected);
  }, []);

  useEffect(() => {
    // Prevent previous-account chat bleed into current session.
    setMessages([]);
    setSelectedVehicleIdx(0);
    setInput('');
  }, [user?.email]);

  const onSend = async () => {
    if (!input.trim()) return;
    if (!selectedVehicle) {
      Alert.alert('No vehicle', 'Add a vehicle first to ask the assistant.');
      return;
    }
    const q = input.trim();
    setMessages((prev) => [...prev, { id: Date.now().toString(), from: 'user', text: q }]);
    setInput('');

    const patch = await fetchAdvisorPatchForVehicle(selectedVehicle);
    const chip = !patch
      ? 'Just Monitor It'
      : patch.urgency === 'overdue'
      ? 'Immediate'
      : patch.urgency === 'soon'
      ? 'Within a Week'
      : 'Just Monitor It';
    const qLower = q.toLowerCase();
    const isVague =
      qLower.length < 12 ||
      /(help|issue|problem|car sounds bad|what should i do|is this bad)\??$/.test(
        qLower
      );
    const topic =
      qLower.includes('oil')
        ? 'oil'
        : qLower.includes('tire') || qLower.includes('tyre') || qLower.includes('rotation')
        ? 'tires'
        : qLower.includes('brake')
        ? 'brakes'
        : qLower.includes('battery')
        ? 'battery'
        : qLower.includes('air filter') || qLower.includes('filter')
        ? 'air filter'
        : null;
    const serviceForTopic =
      topic === 'oil'
        ? 'Oil Change'
        : topic === 'tires'
        ? 'Tire Rotation'
        : topic === 'brakes'
        ? 'Brake Inspection'
        : topic === 'battery'
        ? 'Battery Check'
        : topic === 'air filter'
        ? 'Air Filter Replacement'
        : null;

    const recentForVehicle = services
      .filter((s) => s.vehicle === selectedVehicleName)
      .slice(0, 3)
      .map((s) => `${s.service} (${s.date}, ${s.mileage})`)
      .join('; ');

    const topicHint =
      topic === 'oil'
        ? 'Oil-related questions usually depend on last oil change mileage, oil type, and engine condition.'
        : topic === 'tires'
        ? 'For tires, tread depth, uneven wear, and last rotation date matter most.'
        : topic === 'brakes'
        ? 'For brakes, listen for squeal/grind and check pedal feel and stopping distance.'
        : topic === 'battery'
        ? 'For battery concerns, age, voltage, and starting behavior are the key signals.'
        : topic === 'air filter'
        ? 'For filters, reduced airflow/performance and dirty intake signs are common indicators.'
        : 'I can use your maintenance history and current mileage to estimate urgency.';

    const currentMileage = selectedVehicle.currentMileageNumber;
    let specificInfo = '';
    if (serviceForTopic) {
      const target = services
        .filter((s) => s.vehicle === selectedVehicleName && s.service === serviceForTopic)
        .sort((a, b) => parseMileageValue(b.mileage) - parseMileageValue(a.mileage))[0];
      const interval = getServiceIntervalMiles(serviceForTopic);
      if (!target) {
        specificInfo = `You have not logged ${serviceForTopic} yet, so I am unable to give an accurate due-in mileage. ${serviceForTopic} is typically recommended every ${interval.toLocaleString()} miles for this car profile.`;
      } else {
        const atMileage = parseMileageValue(target.mileage);
        const dueAt = atMileage + interval;
        const remaining = dueAt - currentMileage;
        const dueText =
          remaining < 0
            ? `overdue by about ${Math.abs(Math.round(remaining)).toLocaleString()} miles`
            : `due in about ${Math.round(remaining).toLocaleString()} miles`;
        specificInfo = `Last logged ${serviceForTopic} was at ${atMileage.toLocaleString()} miles (${target.date}). Next ${serviceForTopic} is around ${dueAt.toLocaleString()} miles, so it is ${dueText}.`;
      }
    }

    const advisorStatus = patch
      ? `Advisor overall next service is ${patch.nextService} (${patch.dueText}).`
      : 'Advisor bridge is offline right now, so this response uses local log estimates.';

    const body = isVague
      ? `${topicHint} ${specificInfo || advisorStatus} Can you share symptom details, when it happens, and any dashboard warning lights?`
      : `${topicHint} ${specificInfo || advisorStatus} Recent records: ${recentForVehicle || 'none found'}.`;

    setMessages((prev) => [
      ...prev,
      {
        id: `ai-${Date.now()}`,
        from: 'ai',
        chip,
        text: body,
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>AI Assistant</Text>
        <Text style={styles.subtitle}>
          Ask questions about your vehicle and maintenance history
        </Text>
        <Text
          style={[
            styles.connectionText,
            advisorConnected === false && styles.connectionTextOffline,
          ]}
        >
          Advisor: {advisorConnected === null ? 'checking...' : advisorConnected ? 'connected' : 'offline'}
        </Text>

        <Text style={styles.label}>Vehicle</Text>
        <TouchableOpacity
          style={styles.vehicleSelector}
          onPress={() => {
            if (vehicles.length === 0) {
              Alert.alert('No vehicles', 'Add a vehicle first.');
              return;
            }
            setShowVehicleDropdown((prev) => !prev);
          }}
        >
          <Text style={styles.vehicleSelectorText}>{selectedVehicleName}</Text>
          <Text style={styles.vehicleArrow}>{showVehicleDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showVehicleDropdown && (
          <View style={styles.dropdownMenu}>
            {vehicles.map((v, idx) => (
              <TouchableOpacity
                key={v.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedVehicleIdx(idx);
                  setShowVehicleDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{v.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <ScrollView
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>Welcome to your AI assistant</Text>
              <Text style={styles.welcomeText}>
                Ask about upcoming maintenance, warning signs, or what service to do next for your
                selected vehicle.
              </Text>
            </View>
          )}
          {messages.map((m) =>
            m.from === 'ai' ? (
              <View key={m.id} style={styles.aiRow}>
                <View style={styles.aiBubble}>
                  {!!m.chip && (
                    <View style={styles.urgencyChip}>
                      <Text style={styles.urgencyChipText}>{m.chip}</Text>
                    </View>
                  )}
                  <Text style={styles.aiText}>{m.text}</Text>
                  <Text style={styles.disclaimer}>
                    NOTE: Please consult a certified mechanic for serious issues.
                  </Text>
                </View>
              </View>
            ) : (
              <View key={m.id} style={styles.userRow}>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{m.text}</Text>
                </View>
              </View>
            )
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your car..."
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
          />
          <TouchableOpacity style={styles.sendButton} onPress={onSend}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 20,
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
    marginBottom: 18,
  },
  connectionText: {
    fontSize: 12,
    color: '#15803D',
    marginBottom: 10,
  },
  connectionTextOffline: {
    color: '#B45309',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  vehicleSelector: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  vehicleSelectorText: {
    fontSize: 15,
    color: '#111827',
  },
  vehicleArrow: {
    fontSize: 13,
    color: '#6B7280',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#111827',
  },
  chatArea: {
    flex: 1,
    marginBottom: 14,
  },
  chatContent: {
    paddingBottom: 10,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
  },
  aiRow: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userRow: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  aiBubble: {
    maxWidth: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  userBubble: {
    maxWidth: '82%',
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  aiText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#111827',
  },
  userText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  urgencyChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  urgencyChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  disclaimer: {
    marginTop: 10,
    fontSize: 12,
    fontStyle: 'italic',
    color: '#6B7280',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111827',
  },
  sendButton: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
