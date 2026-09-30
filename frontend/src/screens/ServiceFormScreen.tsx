import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createService, getService, Service, ServiceInput, updateService, uploadServiceImage } from '../services/serviceApi';
import { Action, Feedback, PageHeader, ServiceImage, serviceColors as c, ui } from '../components/ServiceUI';
import { selectImage, SelectedImage } from '../services/imageSelection';

type Props = { id?: string; onBack: () => void; onSaved: () => void; onLogout: () => void };
type FormState = { name: string; description: string; price: string; imageUrl: string };
const empty: FormState = { name: '', description: '', price: '', imageUrl: '' };
const fromService = (service: Service): FormState => ({ name: service.name, description: service.description, price: String(service.price), imageUrl: service.imageUrl || '' });
function validUrl(value: string) { if (!value.trim()) return true; try { const url = new URL(value.trim()); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; } catch { return false; } }

export function ServiceFormScreen({ id, onBack, onSaved, onLogout }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(!!id), [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false), [picking, setPicking] = useState(false), [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0), [stage, setStage] = useState('');
  const savedId = useRef(id);
  const active = useRef(true);
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setLoadError('');
    try { const service = await getService(id); if (active.current) setForm(fromService(service)); }
    catch (failure) { if (active.current) setLoadError(failure instanceof Error ? failure.message : 'Unable to load service.'); }
    finally { if (active.current) setLoading(false); }
  }, [id]);
  useEffect(() => { active.current = true; savedId.current = id; void load(); return () => { active.current = false; }; }, [id, load]);
  const busy = saving || picking;
  const update = (key: keyof FormState, value: string) => setForm(current => ({ ...current, [key]: value }));
  async function choose() {
    setError(''); setPicking(true);
    try { const image = await selectImage(); if (image) setSelectedImage(image); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to choose an image.'); }
    finally { setPicking(false); }
  }
  async function save() {
    if (busy) return;
    setError('');
    const price = Number(form.price);
    if (!form.name.trim()) return setError('Enter a service name.');
    if (form.name.trim().length > 120) return setError('Keep the service name within 120 characters.');
    if (!form.description.trim()) return setError('Enter a service description.');
    if (form.description.trim().length > 2000) return setError('Keep the service description within 2,000 characters.');
    if (!form.price.trim() || !Number.isFinite(price) || price < 0) return setError('Enter a non-negative price in LKR.');
    if (!validUrl(form.imageUrl) || form.imageUrl.length > 2048) return setError('Enter a valid image URL or leave it empty.');
    const input: Pick<ServiceInput, keyof FormState> = { name: form.name.trim(), description: form.description.trim(), price, imageUrl: form.imageUrl.trim() };
    setSaving(true); setStage('Saving service');
    let persisted = false;
    try {
      let saved = savedId.current ? await updateService(savedId.current, input) : await createService({ ...input, isPromoted: false, promoText: '', promoImageUrl: '', promoOrder: 0 });
      savedId.current = saved.id; persisted = true;
      if (selectedImage) {
        setStage('Uploading service image'); setUploadProgress(0);
        saved = await uploadServiceImage(saved.id, selectedImage, setUploadProgress);
        setSelectedImage(null); setForm(current => ({ ...current, imageUrl: saved.imageUrl }));
      }
      onSaved();
    } catch (failure) { setError(`${persisted ? 'Service details were saved. ' : ''}${failure instanceof Error ? failure.message : 'Unable to save service.'}${persisted ? ' Retry to upload the image.' : ''}`); }
    finally { setSaving(false); setStage(''); }
  }
  const field = (key: keyof FormState, label: string, options: { numeric?: boolean; multiline?: boolean; url?: boolean; max?: number } = {}) => <View><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={form[key]} onChangeText={value => update(key, value)} editable={!busy} style={[styles.input, options.multiline && styles.multiline]} multiline={options.multiline} keyboardType={options.numeric ? 'decimal-pad' : 'default'} autoCapitalize={options.url ? 'none' : 'sentences'} autoCorrect={!options.url} maxLength={options.max} /></View>;
  return <SafeAreaView style={ui.safe}><View style={ui.screen}><PageHeader title={id || savedId.current ? 'Edit service' : 'Add service'} onBack={onBack} disabled={busy} />
    {loading ? <Feedback title="Loading service" busy /> : loadError ? <Feedback title="Service unavailable" message={loadError} onRetry={load} /> : <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
      <View style={ui.card}><Text style={ui.heading}>Service details</Text>{field('name', 'Service name', { max: 120 })}{field('description', 'Description', { multiline: true, max: 2000 })}{field('price', 'Price (LKR)', { numeric: true })}<Text style={styles.label}>Service image</Text><ServiceImage uri={selectedImage?.uri || form.imageUrl} name={form.name || 'Service image preview'} large /><Action title={selectedImage || form.imageUrl ? 'Replace service image' : 'Choose service image'} secondary icon="image-outline" disabled={busy} onPress={() => void choose()} />{selectedImage && <Action title="Cancel selection" secondary disabled={busy} onPress={() => setSelectedImage(null)} />}{field('imageUrl', 'Image URL (optional)', { url: true, max: 2048 })}</View>
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}{saving && <Text accessibilityLiveRegion="polite" style={ui.body}>{stage}{stage.startsWith('Uploading') ? `: ${Math.round(uploadProgress * 100)}%` : '...'}</Text>}<Action title="Save service" onPress={save} busy={saving} disabled={busy} /><Action title="Cancel" secondary onPress={onBack} disabled={busy} />
    </ScrollView></KeyboardAvoidingView>}
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({ label: { color: c.dark, fontSize: 14, fontWeight: '600', marginBottom: 8 }, input: { minHeight: 52, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 13, color: c.dark, fontSize: 15, backgroundColor: c.white }, multiline: { minHeight: 100, textAlignVertical: 'top' }, toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 } });
