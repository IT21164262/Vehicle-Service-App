import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getNotificationPage, markAllNotificationsRead, markNotificationRead, Notification, NotificationPage } from '../services/notificationApi';
import { Action, Feedback, PageHeader, serviceColors as c, ui } from '../components/ServiceUI';
import { useRemote } from '../hooks/useRemote';

export function NotificationsScreen({ onBack, onLogout, onOpenAppointment }: { onBack: () => void; onLogout: () => void; onOpenAppointment: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const load = useCallback(() => getNotificationPage(page, 20), [page]);
  const data = useRemote<NotificationPage | null>(load, null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  async function mark(item?: Notification, open = false) {
    if (busy) return;
    setBusy(item?.id || 'all'); setError('');
    try {
      if (item) { if (!item.read) await markNotificationRead(item.id); }
      else await markAllNotificationsRead();
      await data.refresh();
      if (open && item?.appointmentId) onOpenAppointment(item.appointmentId);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to update notifications. Please retry.'); }
    finally { setBusy(null); }
  }
  const count = data.value?.unreadCount || 0;
  return <SafeAreaView style={ui.safe}><View style={ui.screen}><PageHeader title="Notifications" onBack={onBack} disabled={!!busy} />
    <FlatList data={data.error ? [] : data.value?.notifications || []} keyExtractor={item => item.id} contentContainerStyle={ui.content} refreshControl={<RefreshControl refreshing={data.loading} onRefresh={data.refresh} />}
      ListHeaderComponent={<View style={{ gap: 12 }}><Text style={ui.body}>{data.value ? `${count} unread` : 'Appointment updates'}</Text>{count > 0 && <Action title="Mark all as read" secondary busy={busy === 'all'} disabled={!!busy} onPress={() => void mark()} />}{!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}{data.loading && !!data.value && <Text accessibilityLiveRegion="polite" style={ui.body}>Refreshing notifications...</Text>}</View>}
      ListEmptyComponent={data.loading ? <Feedback title="Loading notifications" busy /> : data.error ? <Feedback title="Notifications unavailable" message={data.error} onRetry={data.refresh} /> : <Feedback title="No notifications" message="Your appointment updates will appear here." />}
      renderItem={({ item }) => <View style={[ui.card, !item.read && styles.unread]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${item.read ? 'Read' : 'Unread'}: ${item.title}. Open appointment.`} disabled={!!busy} onPress={() => void mark(item, true)} style={styles.notification}>
          <View style={styles.titleRow}><Ionicons name={item.read ? 'mail-open-outline' : 'mail-unread-outline'} size={22} color={c.green} /><Text style={styles.title}>{item.title}</Text>{!item.read && <View style={styles.dot} />}</View>
          <Text style={ui.body}>{item.message}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text><Text style={styles.link}>View appointment</Text>
        </Pressable>
        {!item.read && <Action title="Mark as read" secondary busy={busy === item.id} disabled={!!busy} onPress={() => void mark(item)} />}
      </View>}
      ListFooterComponent={data.value && !data.error && data.value.total > data.value.limit ? <View style={{ gap: 10 }}><Text style={ui.body}>Page {page} of {Math.ceil(data.value.total / data.value.limit)}</Text><Action title="Previous page" secondary disabled={page === 1 || data.loading || !!busy} onPress={() => setPage(current => current - 1)} /><Action title="Next page" secondary disabled={page * data.value.limit >= data.value.total || data.loading || !!busy} onPress={() => setPage(current => current + 1)} /></View> : null}
    />
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  unread: { borderLeftWidth: 4, borderLeftColor: c.orange }, notification: { gap: 12, minHeight: 48 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, title: { flex: 1, color: c.dark, fontWeight: '700', fontSize: 16 }, date: { color: c.muted, fontSize: 12 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.orange }, link: { color: c.green, fontWeight: '600' },
});
