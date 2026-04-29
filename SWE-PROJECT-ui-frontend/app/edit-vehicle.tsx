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
import { parseVehicleProfileFromName } from './brand-reliability';

export default function EditVehicleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { vehicles, updateVehicle } = useAppData();

  const vehicle = useMemo(
    () => vehicles.find((v) => v.id === String(id || '')),
    [vehicles, id]
  );

  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [mileage, setMileage] = useState('');
  const [vin, setVin] = useState('');

  useEffect(() => {
    if (!vehicle) return;
    const parsed = parseVehicleProfileFromName(vehicle.name);
    setYear(
      String(
        vehicle.modelYear && Number.isFinite(vehicle.modelYear)
          ? vehicle.modelYear
          : parsed.modelYear ?? ''
      )
    );
    setMake(parsed.make || '');
    setModel(parsed.model || '');
    setMileage(String(vehicle.mileage || '').replace(/\s*mi$/i, '').trim());
    setVin(vehicle.vin === 'VIN not added' ? '' : vehicle.vin);
  }, [vehicle]);

  const handleSave = () => {
    if (!vehicle) {
      Alert.alert('Vehicle not found', 'Could not load this vehicle record.');
      return;
    }
    if (!year.trim()) {
      Alert.alert('Missing Info', 'Please enter the vehicle year.');
      return;
    }
    if (!make.trim()) {
      Alert.alert('Missing Info', 'Please enter the vehicle make.');
      return;
    }
    if (!model.trim()) {
      Alert.alert('Missing Info', 'Please enter the vehicle model.');
      return;
    }
    if (!mileage.trim()) {
      Alert.alert('Missing Info', 'Please enter the current mileage.');
      return;
    }
    const numericMileage = Number(mileage.replace(/,/g, ''));
    if (Number.isNaN(numericMileage)) {
      Alert.alert('Invalid Mileage', 'Mileage must be a valid number.');
      return;
    }

    updateVehicle(vehicle.id, {
      year,
      make,
      model,
      mileage,
      vin,
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
          accessibilityLabel="Close edit vehicle popup"
        >
          <View style={styles.handle} />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Edit Vehicle</Text>
          <Text style={styles.subtitle}>Update this vehicle information</Text>

          <Text style={styles.label}>Year *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter year"
            placeholderTextColor="#9CA3AF"
            value={year}
            onChangeText={setYear}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />

          <Text style={styles.label}>Make *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter make"
            placeholderTextColor="#9CA3AF"
            value={make}
            onChangeText={setMake}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />

          <Text style={styles.label}>Model *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter model"
            placeholderTextColor="#9CA3AF"
            value={model}
            onChangeText={setModel}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />

          <Text style={styles.label}>Current Mileage *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter mileage"
            placeholderTextColor="#9CA3AF"
            value={mileage}
            onChangeText={setMileage}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />

          <Text style={styles.label}>VIN (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="17-character VIN"
            placeholderTextColor="#9CA3AF"
            value={vin}
            onChangeText={setVin}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
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
  dimBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.18)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    minHeight: '78%',
    maxHeight: '88%',
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
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
