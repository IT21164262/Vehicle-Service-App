import { useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, Feedback, PageHeader, serviceColors as c, ui } from '../components/ServiceUI';
import { PromotionBanner } from '../components/PromotionBanner';
import { useRemote } from '../hooks/useRemote';
import { listServices, Service, updateService, uploadServicePromoImage } from '../services/serviceApi';
import { selectImage, SelectedImage } from '../services/imageSelection';

type Props = { onBack: () => void; onLogout: () => void; onAddService: () => void };

export function PromotionScreen({ onBack, onLogout, onAddService }: Props) {
  const services = useRemote<Service[]>(listServices, []);
  const [selected, setSelected] = useState<Service | null>(null);
  const [success, setSuccess] = useState('');
  if (selected) return <PromotionForm key={selected.id} service={selected} onLogout={onLogout} onBack={() => setSelected(null)} onSaved={() => {
    setSelected(null); setSuccess('Promotion saved. Enabled promotions appear on the customer home screen.'); void services.refresh();
  }} />;
  return <SafeAreaView style={ui.safe}><View style={ui.screen}>
    <PageHeader title="Customer promotions" onBack={onBack} />
    <ScrollView contentContainerStyle={ui.content} refreshControl={<RefreshControl refreshing={services.loading} onRefresh={services.refresh} />}>
      <Text style={ui.body}>Choose an existing service to add or edit its customer banner. Each service can have one promotion.</Text>
      {!!success && <Text accessibilityLiveRegion="polite" style={ui.body}>{success}</Text>}
      {services.loading && !services.value.length ? <Feedback title="Loading services" busy /> : services.error ? <Feedback title="Services unavailable" message={services.error} onRetry={services.refresh} /> : !services.value.length ? <View style={ui.card}><Text style={ui.heading}>No services yet</Text><Text style={ui.body}>Add a service first, then create its promotion here.</Text><Action title="Add Service" onPress={onAddService} /></View> : services.value.map(service => <View key={service.id} style={ui.card}>
        <Text style={ui.heading}>{service.name}</Text>
        <Text style={ui.body}>{service.isPromoted ? `Enabled · Display order ${service.promoOrder}` : 'Disabled'}</Text>
        {!!service.promoImageUrl && <PromotionBanner imageUrl={service.promoImageUrl} text={service.promoText} name={service.name} />}
        <Action title={service.promoText || service.promoImageUrl ? 'Edit promotion' : 'Add promotion'} onPress={() => { setSuccess(''); setSelected(service); }} />
      </View>)}
    </ScrollView>
  </View></SafeAreaView>;
}

function PromotionForm({ service, onBack, onLogout, onSaved }: { service: Service; onBack: () => void; onLogout: () => void; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(service.isPromoted);
  const [text, setText] = useState(service.promoText || '');
  const [imageUrl, setImageUrl] = useState(service.promoImageUrl || '');
  const [order, setOrder] = useState(String(service.promoOrder ?? 0));
  const [image, setImage] = useState<SelectedImage | null>(null);
  const [saving, setSaving] = useState(false), [picking, setPicking] = useState(false);
  const [error, setError] = useState(''), [stage, setStage] = useState('');
  const [progress, setProgress] = useState(0);
  const busy = saving || picking;
  async function choose() {
    setPicking(true); setError('');
    try { const selected = await selectImage(); if (selected) setImage(selected); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to select image.'); }
    finally { setPicking(false); }
  }
  async function save() {
    if (busy) return;
    setError('');
    const displayOrder = Number(order);
    if (!order.trim() || !Number.isSafeInteger(displayOrder) || displayOrder < 0) return setError('Enter a display order of zero or more.');
    if (text.trim().length > 240) return setError('Keep promotion text within 240 characters.');
    if (enabled && !text.trim()) return setError('Enter promotion text before enabling this banner.');
    if (enabled && !image && !imageUrl) return setError('Choose a banner image before enabling this promotion.');
    setSaving(true);
    let uploaded = false;
    try {
      let savedImageUrl = imageUrl;
      if (image) {
        setStage('Uploading banner'); setProgress(0);
        const saved = await uploadServicePromoImage(service.id, image, setProgress);
        savedImageUrl = saved.promoImageUrl; setImageUrl(savedImageUrl); setImage(null); uploaded = true;
      }
      setStage('Saving promotion');
      await updateService(service.id, { isPromoted: enabled, promoText: text.trim(), promoImageUrl: savedImageUrl, promoOrder: displayOrder });
      onSaved();
    } catch (failure) { setError(`${uploaded ? 'Banner uploaded. ' : ''}${failure instanceof Error ? failure.message : 'Unable to save promotion.'} Retry to finish saving.`); }
    finally { setSaving(false); setStage(''); }
  }
  return <SafeAreaView style={ui.safe}><View style={ui.screen}>
    <PageHeader title="Edit promotion" onBack={onBack} disabled={busy} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
      <View style={ui.card}>
        <Text style={ui.heading}>{service.name}</Text><Text style={ui.body}>This banner opens the selected service. Service details are managed separately.</Text>
        <View style={styles.toggle}><Text style={[styles.label, { flex: 1 }]}>Enable promotion</Text><Switch accessibilityLabel="Enable promotion" value={enabled} onValueChange={setEnabled} disabled={busy} trackColor={{ true: c.green }} /></View>
        <Text style={styles.label}>Promotion text</Text><TextInput accessibilityLabel="Promotion text" value={text} onChangeText={setText} maxLength={240} editable={!busy} multiline style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]} />
        <Text style={styles.label}>Display order</Text><TextInput accessibilityLabel="Display order" value={order} onChangeText={setOrder} editable={!busy} keyboardType="number-pad" style={styles.input} /><Text style={ui.body}>Lower numbers appear first.</Text>
        <Text style={styles.label}>Customer banner preview</Text><PromotionBanner imageUrl={image?.uri || imageUrl} text={text} name={service.name} />
        <Action title={image || imageUrl ? 'Replace promotion image' : 'Choose promotion image'} icon="images-outline" secondary disabled={busy} onPress={choose} />
        {image && <><Text style={ui.body}>Selected image will upload when you save the promotion.</Text><Action title="Cancel selected image" secondary disabled={busy} onPress={() => setImage(null)} /></>}
      </View>
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
      {saving && <Text accessibilityLiveRegion="polite" style={ui.body}>{stage}{stage === 'Uploading banner' ? `: ${Math.round(progress * 100)}%` : '...'}</Text>}
      <Action title="Save promotion" busy={saving} disabled={busy} onPress={save} /><Action title="Cancel" secondary disabled={busy} onPress={onBack} />
    </ScrollView></KeyboardAvoidingView>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  label: { color: c.dark, fontSize: 14, fontWeight: '600' },
  input: { minHeight: 52, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 13, color: c.dark, fontSize: 15, backgroundColor: c.white },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
});
