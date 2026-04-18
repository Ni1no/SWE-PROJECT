import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';

export default function AIAssistantScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>AI Assistant</Text>
        <Text style={styles.subtitle}>
          Ask questions about your vehicle and maintenance history
        </Text>

        <Text style={styles.label}>Vehicle</Text>
        <TouchableOpacity style={styles.vehicleSelector}>
          <Text style={styles.vehicleSelectorText}>2022 Honda Accord</Text>
          <Text style={styles.vehicleArrow}>▼</Text>
        </TouchableOpacity>

        <ScrollView
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {/* AI message */}
          <View style={styles.aiRow}>
            <View style={styles.aiBubble}>
              <View style={styles.urgencyChip}>
                <Text style={styles.urgencyChipText}>Soon</Text>
              </View>

              <Text style={styles.aiText}>
                Based on your mileage, you should change your oil within 500 miles. 
                Regular changes keep your engine healthy.
              </Text>

              <Text style={styles.disclaimer}>
                NOTE: Please consult a certified mechanic for serious issues.
              </Text>
            </View>
          </View>

          {/* User message */}
          <View style={styles.userRow}>
            <View style={styles.userBubble}>
              <Text style={styles.userText}>
                When should I change my oil?
              </Text>
            </View>
          </View>

          {/* AI follow-up */}
          <View style={styles.aiRow}>
            <View style={styles.aiBubble}>
              <Text style={styles.aiText}>
                I recommend synthetic oil every 5,000-7,500 miles or 
                conventional oil every 3,000 miles.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your car..."
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity style={styles.sendButton}>
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
  chatArea: {
    flex: 1,
    marginBottom: 14,
  },
  chatContent: {
    paddingBottom: 10,
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