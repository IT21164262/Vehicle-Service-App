import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { AuthUser } from '../services/authApi';
import { listServices, Service } from '../services/serviceApi';
import { Action, Feedback, formatPrice, ServiceImage, serviceColors as c, ui } from '../components/ServiceUI';

type Props = { user: AuthUser; onView: (id: string) => void; onEdit: (id: string) => void; onAdd: () => void; onDelete: (service: Service) => void; onLogout: () => void; revision: number };

export function CustomerHomeScreen(props: Props) { return <ServiceHomeScreen {...props} administrator={false} />; }
export function AdministratorHomeScreen(props: Props) { return <ServiceHomeScreen {...props} administrator={props.user.isAdmin === true} />; }

function ServiceHomeScreen({ user, onView, onEdit, onAdd, onDelete, onLogout, revision, administrator }: Props & { administrator: boolean }) {
  const [services, setServices] = useState<Service[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const { width, fontScale } = useWindowDimensions();
  const columns = width >= 390 && fontScale <= 1.25 ? 2 : 1;
  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true); setError('');
    try { const data = await listServices(); if (sequence.current === request) setServices(data); }
    catch (failure) { if (sequence.current === request) setError(failure instanceof Error ? failure.message : 'Unable to load services.'); }
    finally { if (sequence.current === request) setLoading(false); }
  }, []);
  useEffect(() => { void load(); return () => { ++sequence.current; }; }, [load, revision]);
  const filtered = services.filter(service => service.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  return <SafeAreaView style={ui.safe} edges={['top', 'bottom', 'left', 'right']}>
    <View style={ui.screen}>
      <FlatList key={columns} data={error || loading ? [] : filtered} numColumns={columns} keyExtractor={item => item.id}
        contentContainerStyle={styles.list} columnWrapperStyle={columns === 2 ? styles.columns : undefined}
        keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading && services.length > 0} onRefresh={load} tintColor={c.green} />}
        ListHeaderComponent={<>
          <View style={styles.header}>
            <View style={styles.topRow}>
              <View style={styles.brand}><Ionicons name="car-sport" size={23} color="white" /><Text style={styles.brandText}>AutoNexa</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Log out" onPress={onLogout} style={styles.logout}><Ionicons name="log-out-outline" size={22} color="white" /><Text style={styles.logoutText}>Log out</Text></Pressable>
            </View>
            <View style={styles.greetingRow}>
              <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
              <View style={{ flex: 1 }}><Text style={styles.greeting}>Hello, {user.name}</Text><Text style={styles.role}>{administrator ? 'Administrator · Service management' : 'Your vehicle, in good hands'}</Text></View>
            </View>
            <Text accessibilityRole="header" style={styles.title}>{administrator ? 'Your services.' : 'Welcome back.'}</Text>
            <Text style={styles.subtitle}>{administrator ? 'Ready to manage.' : 'Good care starts here.'}</Text>
            <View style={styles.search}>
              <Ionicons name="search" size={22} color={c.orange} />
              <TextInput accessibilityLabel="Search services by name" placeholder="Search services by name" placeholderTextColor={c.muted} value={query} onChangeText={setQuery} style={styles.searchInput} autoCorrect={false} returnKeyType="search" />
              {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} style={styles.clear}><Ionicons name="close-circle" size={22} color={c.muted} /></Pressable>}
            </View>
          </View>
          <View style={styles.section}>
            {administrator && <Action title="Add Service" icon="add" onPress={onAdd} />}
            <View style={styles.sectionTitle}><Text style={ui.heading}>{administrator ? 'Manage services' : 'Explore services'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Refresh services" onPress={load} style={styles.clear}><Ionicons name="refresh-outline" size={22} color={c.green} /></Pressable></View>
            <Text style={ui.body}>{administrator ? 'Keep your service details and daily capacity up to date.' : 'Find the right care for your next journey.'}</Text>
          </View>
        </>}
        ListEmptyComponent={loading ? <Feedback title="Loading services" busy /> : error ? <Feedback title="Couldn’t load services" message={error} onRetry={load} /> : <Feedback title={query ? 'No matching services' : 'No services yet'} message={query ? 'Try another service name or clear your search.' : administrator ? 'Add your first service to make it available to customers.' : 'Please check back when services are available.'} />}
        renderItem={({ item }) => <View style={[styles.cardContainer, { width: columns === 2 ? '50%' : '100%' }]}>
          <View style={styles.card}>
            <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.name}`} onPress={() => onView(item.id)} style={styles.cardMain}>
              <ServiceImage uri={item.imageUrl} name={item.name} />
              <Text style={styles.serviceName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.price}>{formatPrice(item.price)}</Text>
              <View style={styles.viewRow}><Text style={styles.viewLabel}>View details</Text><View style={styles.arrow}><Ionicons name="arrow-up-outline" size={17} color="white" style={{ transform: [{ rotate: '45deg' }] }} /></View></View>
            </Pressable>
            {administrator && <View style={styles.adminActions}>
              <Action title="Edit" icon="create-outline" secondary onPress={() => onEdit(item.id)} />
              <Action title="Delete" icon="trash-outline" secondary onPress={() => onDelete(item)} />
            </View>}
          </View>
        </View>}
      />
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  list: { paddingBottom: 28, width: '100%', maxWidth: 840, alignSelf: 'center', flexGrow: 1 },
  header: { backgroundColor: c.green, padding: 22, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { flexDirection: 'row', gap: 8, alignItems: 'center' }, brandText: { color: 'white', fontSize: 19, fontWeight: '700' },
  logout: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6 }, logoutText: { color: 'white', fontSize: 14 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, marginBottom: 22 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#D8E9DB', alignItems: 'center', justifyContent: 'center' }, initials: { color: c.green, fontSize: 16, fontWeight: '700' },
  greeting: { color: 'white', fontSize: 16, fontWeight: '500' }, role: { color: '#CAE1D6', fontSize: 12, marginTop: 5, lineHeight: 18 },
  title: { color: 'white', fontSize: 30, lineHeight: 38, letterSpacing: -0.7 }, subtitle: { color: '#B9D7C8', fontSize: 27, lineHeight: 35, letterSpacing: -0.7 },
  search: { marginTop: 22, paddingLeft: 16, paddingRight: 6, minHeight: 54, borderRadius: 28, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'white' },
  searchInput: { flex: 1, minWidth: 0, minHeight: 54, fontSize: 14, color: c.dark }, clear: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  section: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, gap: 8 }, sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  columns: { paddingHorizontal: 12 }, cardContainer: { paddingHorizontal: 8, paddingBottom: 16 },
  card: { padding: 10, borderRadius: 24, backgroundColor: 'white', flex: 1, gap: 12, marginHorizontal: 4 },
  cardMain: { gap: 9, flex: 1 }, serviceName: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: c.dark },
  description: { color: c.muted, fontSize: 13, lineHeight: 19 }, price: { color: c.green, fontSize: 16, fontWeight: '700', marginTop: 3 },
  viewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, minHeight: 44 }, viewLabel: { color: c.dark, fontSize: 13, flexShrink: 1 },
  arrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.orange, alignItems: 'center', justifyContent: 'center' },
  adminActions: { gap: 8, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12 },
});
