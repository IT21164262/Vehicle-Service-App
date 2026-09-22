import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appointment, AppointmentStatus, deleteAppointment, listAppointments, updateAppointmentStatus } from '../services/appointmentApi';
import { Action, Feedback, PageHeader, serviceColors as c, ui } from '../components/ServiceUI';

type Props = { administrator: boolean; onBack: () => void; onEdit: (item: Appointment) => void; onLogout: () => void };
const statuses: AppointmentStatus[] = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
const formatDate = (value: string) => new Date(value).toLocaleDateString();

export function AppointmentScreen({ administrator, onBack, onEdit, onLogout }: Props) {
  const [items, setItems] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<AppointmentStatus | 'All'>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await listAppointments()); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to load appointments.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const visible = [...(filter === 'All' ? items : items.filter(item => item.status === filter))].sort((left, right) => {
    if (filter === 'All' && left.status !== right.status) {
      if (left.status === 'Pending') return -1;
      if (right.status === 'Pending') return 1;
    }
    return new Date(left.appointmentDate).getTime() - new Date(right.appointmentDate).getTime();
  });
  async function change(item: Appointment, status: AppointmentStatus) {
    try { await updateAppointmentStatus(item.id, status); await load(); }
    catch (failure) { Alert.alert('Unable to update appointment', failure instanceof Error ? failure.message : 'Please try again.'); }
  }
  async function remove(item: Appointment) {
    try { await deleteAppointment(item.id); await load(); }
    catch (failure) { Alert.alert('Unable to delete appointment', failure instanceof Error ? failure.message : 'Please try again.'); }
  }
  return <SafeAreaView style={ui.safe} edges={['top', 'bottom', 'left', 'right']}><View style={ui.screen}><PageHeader title={administrator ? 'All appointments' : 'My appointments'} onBack={onBack} />
    <View style={styles.filters}><Pressable onPress={() => setFilter('All')} style={[styles.filter, filter === 'All' && styles.active]}><Text>All</Text></Pressable>{statuses.map(status => <Pressable key={status} onPress={() => setFilter(status)} style={[styles.filter, filter === status && styles.active]}><Text>{status}</Text></Pressable>)}</View>
    {loading ? <Feedback title="Loading appointments" busy /> : error ? <Feedback title="Couldn’t load appointments" message={error} onRetry={load} /> : <FlatList data={visible} keyExtractor={item => item.id} contentContainerStyle={ui.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} ListEmptyComponent={<Feedback title={administrator ? 'No appointments' : 'No appointments yet'} message="Appointments will appear here when they are created." />} renderItem={({ item }) => <View style={ui.card}>
      <View style={styles.row}><Text style={ui.heading}>{item.vehicleNumber}</Text><Text style={[styles.badge, { backgroundColor: item.status === 'Cancelled' ? '#F4D8DD' : item.status === 'Completed' ? '#D8E9DB' : '#FFE5D6' }]}>{item.status}</Text></View>
      <Text style={ui.body}>Service: {item.serviceName}</Text><Text style={ui.body}>Date: {formatDate(item.appointmentDate)}</Text>
      {administrator && item.status === 'Pending' && <View style={styles.actions}><Action title="Confirm" onPress={() => change(item, 'Confirmed')} /><Action title="Cancel" secondary onPress={() => change(item, 'Cancelled')} /></View>}
      {administrator && item.status === 'Confirmed' && <View style={styles.actions}><Action title="Complete" onPress={() => change(item, 'Completed')} /><Action title="Cancel" secondary onPress={() => change(item, 'Cancelled')} /></View>}
      {!administrator && item.status === 'Pending' && <View style={styles.actions}><Action title="Edit" icon="create-outline" onPress={() => onEdit(item)} /><Action title="Delete" icon="trash-outline" danger onPress={() => Alert.alert('Delete appointment?', 'This Pending appointment will be removed.', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void remove(item) }])} /></View>}
    </View>} />}
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, backgroundColor: c.cream },
  filter: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18, backgroundColor: c.white },
  active: { backgroundColor: c.pale },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, color: c.dark, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
});
