import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createService, getService, ServiceInput, updateService } from '../services/serviceApi';
import { PageHeader, serviceColors as c, ui } from '../components/ServiceUI';

type Props = { id?: string; onBack: () => void; onSaved: () => void; onLogout: () => void };
type FormState = { name: string; description: string; price: string; imageUrl: string; maxAppointmentsPerDay: string };
const empty: FormState = { name: '', description: '', price: '', imageUrl: '', maxAppointmentsPerDay: '' };

export function ServiceFormScreen({ id, onBack, onSaved, onLogout }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!id) return;
    void getService(id).then(service => setForm({ name: service.name, description: service.description, price: String(service.price), imageUrl: service.imageUrl, maxAppointmentsPerDay: String(service.maxAppointmentsPerDay) }))
      .catch(failure => setError(failure instanceof Error ? failure.message : 'Unable to load service.')).finally(() => setLoading(false));
  }, [id]);
  const update = (key: keyof FormState, value: string) => setForm(current => ({ ...current, [key]: value }));
  async function save() {
    setError('');
    const price = Number(form.price), capacity = Number(form.maxAppointmentsPerDay);
    if (!form.name.trim() || !form.description.trim()) return setError('Name and description are required.');
    if (!Number.isFinite(price) || price < 0) return setError('Price must be a non-negative number.');
    if (!Number.isSafeInteger(capacity) || capacity < 1) return setError('Daily capacity must be a positive integer.');
    if (form.imageUrl.trim() && !/^https?:\/\/[^\s]+$/i.test(form.imageUrl.trim())) return setError('Image URL must be a valid HTTP or HTTPS URL.');
    const input: ServiceInput = { name: form.name.trim(), description: form.description.trim(), price, imageUrl: form.imageUrl.trim(), maxAppointmentsPerDay: capacity };
    setSaving(true);
    try { if (id) await updateService(id, input); else await createService(input); onSaved(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save service.'); }
    finally { setSaving(false); }
  }
  if (loading) return <SafeAreaView style={ui.safe}><View style={styles.center}><ActivityIndicator size="large" color={c.green} /></View></SafeAreaView>;
  return <SafeAreaView style={ui.safe} edges={['top', 'bottom', 'left', 'right']}><View style={ui.screen}><PageHeader title={id ? 'Edit service' : 'Add service'} onBack={onBack} onLogout={onLogout} disabled={saving} />
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
      <Text style={ui.body}>Add the details customers need to choose this service. Image upload is not available yet.</Text>
      {([['name', 'Service name', 'e.g. Full vehicle wash'], ['description', 'Description', 'Describe what is included'], ['price', 'Price (LKR)', '0.00'], ['maxAppointmentsPerDay', 'Daily capacity', 'Positive whole number'], ['imageUrl', 'Image URL (optional)', 'https://example.com/image.jpg']] as const).map(([key, label, placeholder]) => <View key={key}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={form[key]} onChangeText={value => update(key, value)} placeholder={placeholder} placeholderTextColor={c.muted} style={[styles.input, key === 'description' && styles.multiline]} multiline={key === 'description'} keyboardType={key === 'price' || key === 'maxAppointmentsPerDay' ? 'decimal-pad' : 'default'} autoCapitalize={key === 'imageUrl' ? 'none' : 'sentences'} /></View>)}
      {error ? <Text accessibilityRole="alert" style={ui.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }} disabled={saving} onPress={save} style={({ pressed }) => [ui.action, pressed && { opacity: 0.75 }, saving && { opacity: 0.65 }]}>{saving ? <ActivityIndicator color="white" /> : <Text style={ui.actionText}>Save service</Text>}</Pressable>
    </ScrollView></KeyboardAvoidingView>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, backgroundColor: c.cream, alignItems: 'center', justifyContent: 'center' },
  label: { color: c.dark, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: { minHeight: 52, backgroundColor: c.white, borderColor: c.border, borderWidth: 1, borderRadius: 16, paddingHorizontal: 15, paddingVertical: 13, color: c.dark, fontSize: 15, marginBottom: 15 },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
});
