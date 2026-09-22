import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createService, getService, ServiceInput, updateService, uploadServiceImage } from '../services/serviceApi';
import { Action, PageHeader, serviceColors as c, ui } from '../components/ServiceUI';

type Props = { id?: string; onBack: () => void; onSaved: () => void; onLogout: () => void };
type FormState = { name: string; description: string; price: string; imageUrl: string; maxAppointmentsPerDay: string };
type SelectedImage = { uri: string; name: string; type: string; file?: Blob; size?: number };
const empty: FormState = { name: '', description: '', price: '', imageUrl: '', maxAppointmentsPerDay: '' };

export function ServiceFormScreen({ id, onBack, onSaved, onLogout }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  useEffect(() => {
    if (!id) return;
    void getService(id).then(service => setForm({ name: service.name, description: service.description, price: String(service.price), imageUrl: service.imageUrl, maxAppointmentsPerDay: String(service.maxAppointmentsPerDay) }))
      .catch(failure => setError(failure instanceof Error ? failure.message : 'Unable to load service.')).finally(() => setLoading(false));
  }, [id]);
  const update = (key: keyof FormState, value: string) => setForm(current => ({ ...current, [key]: value }));
  async function chooseImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const type = asset.mimeType || 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) return setError('Choose a JPEG, PNG or WebP image.');
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) return setError('Image must be 5 MB or smaller.');
    setError('');
    setSelectedImage({ uri: asset.uri, name: asset.fileName || `service-image.${type.split('/')[1]}`, type, file: asset.file, size: asset.fileSize });
  }
  async function save() {
    setError('');
    const price = Number(form.price), capacity = Number(form.maxAppointmentsPerDay);
    if (!form.name.trim() || !form.description.trim()) return setError('Name and description are required.');
    if (!Number.isFinite(price) || price < 0) return setError('Price must be a non-negative number.');
    if (!Number.isSafeInteger(capacity) || capacity < 1) return setError('Daily capacity must be a positive integer.');
    if (form.imageUrl.trim() && !/^https?:\/\/[^\s]+$/i.test(form.imageUrl.trim())) return setError('Image URL must be a valid HTTP or HTTPS URL.');
    const input: ServiceInput = { name: form.name.trim(), description: form.description.trim(), price, imageUrl: form.imageUrl.trim(), maxAppointmentsPerDay: capacity };
    setSaving(true);
    try {
      const saved = id ? await updateService(id, input) : await createService(input);
      if (selectedImage) {
        if (!saved.id) throw new Error('The service was saved but its image could not be uploaded.');
        setUploadProgress(0);
        const uploaded = await uploadServiceImage(saved.id, selectedImage, setUploadProgress);
        setForm(current => ({ ...current, imageUrl: uploaded.imageUrl }));
      }
      onSaved();
    }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save service.'); }
    finally { setSaving(false); }
  }
  if (loading) return <SafeAreaView style={ui.safe}><View style={styles.center}><ActivityIndicator size="large" color={c.green} /></View></SafeAreaView>;
  return <SafeAreaView style={ui.safe} edges={['top', 'bottom', 'left', 'right']}><View style={ui.screen}><PageHeader title={id ? 'Edit service' : 'Add service'} onBack={onBack} onLogout={onLogout} disabled={saving} />
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
      <Text style={ui.body}>Add the details customers need to choose this service.</Text>
      <Text style={styles.label}>Service image</Text>
      {selectedImage || form.imageUrl ? <Image source={{ uri: selectedImage?.uri || form.imageUrl }} style={styles.preview} resizeMode="cover" /> : <View style={styles.noImage}><Text style={ui.body}>No image selected. Customers will see a placeholder.</Text></View>}
      <Action title={selectedImage ? 'Choose a different image' : 'Choose image'} icon="image-outline" secondary onPress={chooseImage} disabled={saving} />
      {!!selectedImage && <Text style={ui.body}>Upload progress: {Math.round(uploadProgress * 100)}%</Text>}
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
  preview: { width: '100%', height: 180, borderRadius: 18, marginBottom: 12, backgroundColor: c.pale },
  noImage: { minHeight: 78, padding: 16, borderRadius: 18, backgroundColor: c.pale, justifyContent: 'center', marginBottom: 12 },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
});
