import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
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
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const deleteInFlight = useRef(false);
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
  function closeDelete() {
    if (!deleteInFlight.current) { setDeleteTarget(null); setDeleteError(''); }
  }
  async function remove() {
    if (!deleteTarget || administrator || deleteTarget.status !== 'Pending' || deleteInFlight.current) return;
    deleteInFlight.current = true;
    setDeleting(true); setDeleteError('');
    try {
      await deleteAppointment(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (failure) {
      setDeleteError(failure instanceof Error ? failure.message : 'Unable to delete appointment. Please try again.');
    } finally { deleteInFlight.current = false; setDeleting(false); }
  }
  return <SafeAreaView style={ui.safe} edges={['top', 'bottom', 'left', 'right']}><View style={ui.screen}><PageHeader title={administrator ? 'All appointments' : 'My appointments'} onBack={onBack} />
    <View style={styles.filters}><Pressable onPress={() => setFilter('All')} style={[styles.filter, filter === 'All' && styles.active]}><Text>All</Text></Pressable>{statuses.map(status => <Pressable key={status} onPress={() => setFilter(status)} style={[styles.filter, filter === status && styles.active]}><Text>{status}</Text></Pressable>)}</View>
    {loading ? <Feedback title="Loading appointments" busy /> : error ? <Feedback title="Couldn’t load appointments" message={error} onRetry={load} /> : <FlatList data={visible} keyExtractor={item => item.id} contentContainerStyle={ui.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} ListEmptyComponent={<Feedback title={administrator ? 'No appointments' : 'No appointments yet'} />} renderItem={({ item }) => <View style={ui.card}>
      <View style={styles.row}><Text style={ui.heading}>{item.vehicleNumber}</Text><Text style={[styles.badge, { backgroundColor: item.status === 'Cancelled' ? '#F4D8DD' : item.status === 'Completed' ? '#D8E9DB' : '#FFE5D6' }]}>{item.status}</Text></View>
      <Text style={ui.body}>Service: {item.serviceName}</Text><Text style={ui.body}>Date: {formatDate(item.appointmentDate)}</Text>
      {administrator && item.status === 'Pending' && <View style={styles.actions}><Action title="Confirm" onPress={() => change(item, 'Confirmed')} /><Action title="Cancel" secondary onPress={() => change(item, 'Cancelled')} /></View>}
      {administrator && item.status === 'Confirmed' && <View style={styles.actions}><Action title="Complete" onPress={() => change(item, 'Completed')} /><Action title="Cancel" secondary onPress={() => change(item, 'Cancelled')} /></View>}
      {!administrator && item.status === 'Pending' && <View style={styles.actions}><Action title="Edit" icon="create-outline" onPress={() => onEdit(item)} /><Action title="Delete" icon="trash-outline" danger disabled={deleting} onPress={() => { setDeleteError(''); setDeleteTarget(item); }} /></View>}
    </View>} />}
    <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={closeDelete}>
      <View style={styles.backdrop}><View style={[ui.card, styles.dialog]} accessibilityViewIsModal>
        <Text style={ui.heading}>Delete appointment?</Text>
        <Text style={ui.body}>Permanently delete the pending appointment for {deleteTarget?.vehicleNumber}?</Text>
        {!!deleteError && <Text accessibilityRole="alert" style={ui.error}>{deleteError}</Text>}
        <Action title={deleting ? 'Deleting...' : 'Delete appointment'} danger busy={deleting} onPress={remove} />
        <Action title="Keep appointment" secondary disabled={deleting} onPress={closeDelete} />
      </View></View>
    </Modal>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, backgroundColor: c.cream },
  filter: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18, backgroundColor: c.white },
  active: { backgroundColor: c.pale },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, color: c.dark, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.6)' },
  dialog: { width: '100%', maxWidth: 420 },
});
