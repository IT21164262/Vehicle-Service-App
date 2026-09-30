import { createElement, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { Appointment, createAppointment, updateAppointment } from '../services/appointmentApi';
import { AuthUser } from '../services/authApi';
import { Action, PageHeader, serviceColors as c, ui } from '../components/ServiceUI';

function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function AppointmentFormScreen({ user, serviceId, appointment, onBack, onSaved, onLogout }: { user: AuthUser; serviceId: string; appointment?: Appointment; onBack: () => void; onSaved: () => void; onLogout: () => void }) {
  const [vehicleNumber, setVehicleNumber] = useState(appointment?.vehicleNumber || '');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const initialDate = appointment ? new Date(appointment.appointmentDate) : today;
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(Number.isFinite(initialDate.getTime()) && initialDate >= today ? initialDate : null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const androidPickerOpen = useRef(false);
  useEffect(() => () => {
    if (androidPickerOpen.current) {
      androidPickerOpen.current = false;
      void DateTimePickerAndroid.dismiss('date');
    }
  }, []);
  function openAndroidDatePicker() {
    // A synchronous guard also blocks repeated taps before React renders again.
    if (androidPickerOpen.current) return;
    androidPickerOpen.current = true;
    DateTimePickerAndroid.open({
      value: appointmentDate || today,
      mode: 'date',
      display: 'default',
      minimumDate: today,
      onValueChange: (event, selectedDate) => {
        if (!androidPickerOpen.current) return;
        androidPickerOpen.current = false;
        handleDateChange(event, selectedDate);
      },
      onDismiss: () => {
        androidPickerOpen.current = false;
      },
      onError: () => {
        if (!androidPickerOpen.current) return;
        androidPickerOpen.current = false;
        setError('Unable to open the date picker. Please try again.');
      },
    });
  }
  function handleDateChange(_event: DateTimePickerChangeEvent, selectedDate: Date) {
    if (selectedDate >= today) {
      setAppointmentDate(selectedDate);
      setError('');
    }
  }
  function handleWebDateChange(value: string) {
    const selectedDate = new Date(`${value}T00:00:00`);
    if (value && Number.isFinite(selectedDate.getTime()) && selectedDate >= today) {
      setAppointmentDate(selectedDate);
      setError('');
    }
  }
  const minimumDate = localDateValue(today);
  const selectedDateValue = appointmentDate ? localDateValue(appointmentDate) : '';
  async function save() {
    setError('');
    if (!vehicleNumber.trim() || !appointmentDate) return setError('Vehicle number and appointment date are required.');
    if (!Number.isFinite(appointmentDate.getTime()) || appointmentDate < today) return setError('Choose today or a future date.');
    setSaving(true);
    try { if (appointment) await updateAppointment(appointment.id, { vehicleNumber: vehicleNumber.trim(), appointmentDate: appointmentDate.toISOString() }); else await createAppointment({ userId: user.id, serviceId, vehicleNumber: vehicleNumber.trim(), appointmentDate: appointmentDate.toISOString() }); onSaved(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to create appointment.'); }
    finally { setSaving(false); }
  }
  return <SafeAreaView style={ui.safe}><View style={ui.screen}><PageHeader title={appointment ? 'Edit appointment' : 'Book appointment'} onBack={onBack} disabled={saving} /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={ui.content}>
    <Text style={styles.label}>Vehicle number</Text><TextInput value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="ABC-1234" placeholderTextColor={c.muted} style={styles.input} autoCapitalize="characters" /><Text style={styles.label}>Appointment date</Text>{Platform.OS === 'web' ? <View style={styles.picker}>{createElement('input', { type: 'date', min: minimumDate, value: selectedDateValue, onChange: (event: { target: { value: string } }) => handleWebDateChange(event.target.value), 'aria-label': 'Appointment date', style: { width: '100%', minHeight: 40, border: 'none', backgroundColor: c.white, color: c.dark, fontSize: 16 } })}</View> : Platform.OS === 'android' ? <Pressable accessibilityRole="button" accessibilityLabel="Appointment date" onPress={openAndroidDatePicker} style={styles.picker}><Text style={{ color: c.dark, fontSize: 16 }}>{appointmentDate ? appointmentDate.toLocaleDateString() : 'Select a date'}</Text></Pressable> : <View style={styles.picker}><DateTimePicker value={appointmentDate || today} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={today} onValueChange={handleDateChange} /></View>}
    {error ? <Text accessibilityRole="alert" style={ui.error}>{error}</Text> : null}<Action title={saving ? 'Saving...' : appointment ? 'Save changes' : 'Create appointment'} onPress={save} busy={saving} />
  </ScrollView></KeyboardAvoidingView></View></SafeAreaView>;
}
const styles = StyleSheet.create({ label: { color: c.dark, fontWeight: '700', marginBottom: 8 }, input: { minHeight: 52, backgroundColor: c.white, borderColor: c.border, borderWidth: 1, borderRadius: 16, paddingHorizontal: 15, color: c.dark, marginBottom: 15 }, picker: { minHeight: 52, backgroundColor: c.white, borderColor: c.border, borderWidth: 1, borderRadius: 16, justifyContent: 'center', paddingHorizontal: 10, marginBottom: 8 } });
