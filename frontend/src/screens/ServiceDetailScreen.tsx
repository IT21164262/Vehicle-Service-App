import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getService, Service } from '../services/serviceApi';
import { Action, Feedback, formatPrice, PageHeader, ServiceImage, serviceColors as c, ui } from '../components/ServiceUI';

type Props = { id: string; administrator: boolean; onBack: () => void; onEdit: (id: string) => void; onLogout: () => void; onBook: (id: string) => void };

export function ServiceDetailScreen({ id, administrator, onBack, onEdit, onLogout, onBook }: Props) {
  const [service, setService] = useState<Service | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true); setError('');
    try { setService(await getService(id)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to load service.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [id]);

  return <SafeAreaView style={ui.safe} edges={['top', 'bottom', 'left', 'right']}>
    <View style={ui.screen}><PageHeader title="Service details" onBack={onBack} />
      {loading ? <Feedback title="Loading service" busy /> : error ? <Feedback title="Couldn’t load service" message={error} onRetry={load} /> : service ? <ScrollView contentContainerStyle={ui.content}>
        <ServiceImage uri={service.imageUrl} name={service.name} large />
        <View style={styles.headingRow}><Text style={ui.heading}>{service.name}</Text><Text style={styles.price}>{formatPrice(service.price)}</Text></View>
        <Text style={ui.body}>{service.description}</Text>
        {!administrator && <Action title="Book this service" icon="calendar-outline" onPress={() => onBook(service.id)} />}
        {administrator && <Action title="Edit service" icon="create-outline" onPress={() => onEdit(service.id)} />}
      </ScrollView> : <Feedback title="Service not found" />}
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  headingRow: { gap: 8 },
  price: { color: c.orange, fontSize: 22, fontWeight: '800' },
});
