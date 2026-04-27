import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppData } from './data-context';

const serviceTypes = [
  'Oil Change',
  'Tire Rotation',
  'Brake Inspection',
  'Battery Check',
  'Air Filter Replacement',
  'Custom',
];

export default function EditServiceScreen() {
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const { vehicles, services, updateService } = useAppData();

  const record = useMemo(
    () => (id ? services.find((s) => s.id === id) : undefined),
    [services, id]
  );

  const vehicleNames = vehicles.map((v) => v.name);

  const [selectedVehicle, setSelectedVehicle] = useState(
    () => record?.vehicle ?? vehicleNames[0] ?? ''
  );
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);

  const [selectedService, setSelectedService] = useState('Oil Change');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  const [customService, setCustomService] = useState('');
  const [date, setDate] = useState('');
  const [mileage, setMileage] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!record) return;
    setSelectedVehicle(record.vehicle);
    const preset = serviceTypes.filter((t) => t !== 'Custom').includes(record.service)
      ? record.service
      : 'Custom';
    setSelectedService(preset);
    setCustomService(
      preset === 'Custom' ? record.service : ''
    );
    setDate(record.date);
    setMileage(
      record.mileage.replace(/\s*mi\s*$/i, '').replace(/,/g, '')
    );
    setNotes(record.notes ?? '');
  }, [record]);

  if (!record || !id) {
    return (
      <View style={[styles.screen, styles.centerMissing]}>
        <Text style={styles.missing}>Record not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayedService =
    selectedService === 'Custom' && customService.trim()
      ? customService
      : selectedService;

  const handleSave = () => {
    if (!selectedVehicle.trim()) {
      Alert.alert('Missing Info', 'Please choose a vehicle.');
      return;
    }
    if (!selectedService.trim()) {
      Alert.alert('Missing Info', 'Please choose a service type.');
      return;
    }
    if (selectedService === 'Custom' && !customService.trim()) {
      Alert.alert('Missing Info', 'Please enter your custom service type.');
      return;
    }
    if (!date.trim()) {
      Alert.alert('Missing Info', 'Please enter a date.');
      return;
    }
    if (!mileage.trim()) {
      Alert.alert('Missing Info', 'Please enter mileage.');
      return;
    }
    const numericMileage = Number(mileage.replace(/,/g, ''));
    if (Number.isNaN(numericMileage)) {
      Alert.alert('Invalid Mileage', 'Mileage must be a valid number.');
      return;
    }

    updateService(id, {
      vehicle: selectedVehicle,
      serviceType: displayedService,
      date,
      mileage,
      notes,
    });
    router.back();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.dimBackground} />

      <View style={styles.sheet}>
        <TouchableOpacity
          style={styles.handleTapArea}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Close edit service popup"
        >
          <View style={styles.handle} />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Edit Maintenance Record</Text>
          <Text style={styles.subtitle}>Update this service entry</Text>

          <Text style={styles.label}>Vehicle *</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => {
              setShowVehicleDropdown(!showVehicleDropdown);
              setShowServiceDropdown(false);
              Keyboard.dismiss();
            }}
          >
            <Text style={styles.dropdownText}>{selectedVehicle}</Text>
            <Text style={styles.dropdownArrow}>
              {showVehicleDropdown ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {showVehicleDropdown && (
            <View style={styles.dropdownMenu}>
              {vehicleNames.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedVehicle(vehicle);
                    setShowVehicleDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{vehicle}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Service Type *</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => {
              setShowServiceDropdown(!showServiceDropdown);
              setShowVehicleDropdown(false);
              Keyboard.dismiss();
            }}
          >
            <Text style={styles.dropdownText}>{displayedService}</Text>
            <Text style={styles.dropdownArrow}>
              {showServiceDropdown ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {showServiceDropdown && (
            <View style={styles.dropdownMenu}>
              {serviceTypes.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedService(item);
                    setShowServiceDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedService === 'Custom' && (
            <>
              <Text style={styles.label}>Custom Service Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter custom service"
                placeholderTextColor="#9CA3AF"
                value={customService}
                onChangeText={setCustomService}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </>
          )}

          <Text style={styles.label}>Date *</Text>
          <TextInput
            style={styles.input}
            placeholder="MM/DD/YYYY"
            placeholderTextColor="#9CA3AF"
            value={date}
            onChangeText={setDate}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />

          <Text style={styles.label}>Mileage *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter mileage"
            placeholderTextColor="#9CA3AF"
            value={mileage}
            onChangeText={setMileage}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />

          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes about the service, shop, or cost"
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
            blurOnSubmit={true}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    justifyContent: 'flex-end',
  },
  centerMissing: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 120,
  },
  missing: {
    padding: 24,
    fontSize: 16,
    color: '#374151',
  },
  link: {
    paddingHorizontal: 24,
    color: '#2563EB',
    fontWeight: '600',
  },
  dimBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.18)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    minHeight: '82%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 54,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    marginTop: 12,
    marginBottom: 8,
  },
  handleTapArea: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 22,
    paddingBottom: 34,
    paddingTop: 8,
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
    marginBottom: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    marginTop: 6,
  },
  dropdown: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dropdownText: {
    fontSize: 15,
    color: '#111827',
  },
  dropdownArrow: {
    fontSize: 13,
    color: '#6B7280',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#111827',
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
  },
  notesInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
