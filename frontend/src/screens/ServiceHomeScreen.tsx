import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { AuthUser } from '../services/authApi';
import { listPopularServices, listPromotedServices, listRecentServices, listServices, Service } from '../services/serviceApi';
import { Action, Feedback, formatPrice, ServiceImage, serviceColors as c, ui } from '../components/ServiceUI';
import { Avatar } from '../components/Avatar';
import { PromotionBanner } from '../components/PromotionBanner';
import { getNotificationPage } from '../services/notificationApi';
import { useRemote } from '../hooks/useRemote';
import { useForegroundRefresh } from '../hooks/useForegroundRefresh';

type Props = { user: AuthUser; onView: (id: string) => void; onEdit: (id: string) => void; onAdd: () => void; onPromotions: () => void; onDelete: (service: Service) => void; onLogout: () => void; onAppointments: () => void; onProfile: () => void; onNotifications: () => void; revision: number };
type Filters = { sort: 'name' | 'price'; order: 'asc' | 'desc'; min: string; max: string };
const defaults: Filters = { sort: 'name', order: 'asc', min: '', max: '' };
export function CustomerHomeScreen(props: Props) { return <ServiceHomeScreen {...props} administrator={false} />; }
export function AdministratorHomeScreen(props: Props) { return <ServiceHomeScreen {...props} administrator={props.user.isAdmin === true} />; }

function ServiceHomeScreen({ user, onView, onEdit, onAdd, onPromotions, onDelete, onLogout, onAppointments, onProfile, onNotifications, revision, administrator }: Props & { administrator: boolean }) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(defaults);
  const [draft, setDraft] = useState<Filters>(defaults);
  const [filterError, setFilterError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [date, setDate] = useState(new Date());
  const [bannerWidth, setBannerWidth] = useState(280);
  const [promoIndex, setPromoIndex] = useState(0);
  const carousel = useRef<ScrollView>(null);
  const list = useRef<FlatList<Service>>(null);
  const { width, fontScale } = useWindowDimensions();
  const columns = width >= 340 && fontScale < 1.3 ? 2 : 1;
  const filtered = !!query.trim() || filters.min !== '' || filters.max !== '' || filters.sort !== 'name' || filters.order !== 'asc';
  const all = administrator || showAll || filtered;
  useEffect(() => { const timer = setTimeout(() => setSearch(query.trim()), 300); return () => clearTimeout(timer); }, [query]);
  useEffect(() => { const timer = setInterval(() => setDate(new Date()), 60000); return () => clearInterval(timer); }, []);
  useForegroundRefresh(() => setDate(new Date()));
  const loadServices = useCallback(() => {
    // Backend search is a regex; escape user text to keep this a literal name search.
    const literal = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return listServices({ search: literal, sort: filters.sort, order: filters.order, priceMin: filters.min ? Number(filters.min) : undefined, priceMax: filters.max ? Number(filters.max) : undefined });
  }, [search, filters, revision]);
  const services = useRemote(loadServices, [] as Service[]);
  const promotions = useRemote(useCallback(() => administrator ? Promise.resolve([]) : listPromotedServices(), [administrator, revision]), [] as Service[]);
  const recent = useRemote(useCallback(() => administrator ? Promise.resolve([]) : listRecentServices(), [administrator, revision]), [] as Service[]);
  const popular = useRemote(useCallback(() => administrator ? Promise.resolve([]) : listPopularServices(), [administrator, revision]), [] as Service[]);
  const notices = useRemote(useCallback(() => getNotificationPage(1, 1), [user.id]), null);
  useEffect(() => { setPromoIndex(0); carousel.current?.scrollTo({ x: 0, animated: false }); }, [bannerWidth, promotions.value]);
  useEffect(() => {
    if (administrator) return;
    const timer = setInterval(() => { void recent.refresh(); }, 10000);
    return () => clearInterval(timer);
  }, [administrator, recent.refresh]);
  useEffect(() => {
    if (!administrator) return;
    const timer = setInterval(() => { void notices.refresh(); }, 10000);
    return () => clearInterval(timer);
  }, [administrator, notices.refresh]);
  function refresh() { void services.refresh(); void notices.refresh(); if (!administrator) { void promotions.refresh(); void recent.refresh(); void popular.refresh(); } }
  function openAll() { setShowAll(true); list.current?.scrollToOffset({ offset: 0, animated: true }); }
  function openHome() { setShowAll(false); setQuery(''); setSearch(''); setFilters(defaults); list.current?.scrollToOffset({ offset: 0, animated: true }); }
  function applyFilters() {
    const min = draft.min.trim(), max = draft.max.trim();
    if ((min && (!Number.isFinite(Number(min)) || Number(min) < 0)) || (max && (!Number.isFinite(Number(max)) || Number(max) < 0)) || (min && max && Number(min) > Number(max))) return setFilterError('Enter valid non-negative prices. Minimum must not exceed maximum.');
    setFilters({ ...draft, min, max }); setShowAll(true); setShowFilters(false);
  }
  const source = all ? services : popular;
  const unread = notices.value?.unreadCount || 0;
  const data = source.error || source.loading || (all && search !== query.trim()) ? [] : source.value;
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;

  return <SafeAreaView style={ui.safe} edges={['top', 'bottom', 'left', 'right']}><View style={ui.screen}>
    <FlatList ref={list} key={columns} data={data} numColumns={columns} keyExtractor={item => item.id} contentContainerStyle={styles.list} columnWrapperStyle={columns === 2 ? styles.columns : undefined} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={source.loading} onRefresh={refresh} tintColor={c.green} />}
      ListHeaderComponent={<>
        <View style={styles.header}>
          <View style={styles.brandRow}><View style={styles.brand}><Image source={require('../../assets/autonexa-vehicle-logo.png')} style={styles.brandLogo} accessibilityLabel="AutoNexa vehicle logo" /><Text style={styles.brandText}>AutoNexa</Text></View>{administrator && <Text style={styles.adminLabel}>ADMINISTRATOR</Text>}</View>
          <View style={styles.greetingRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={onProfile} style={styles.avatarButton}><Avatar name={user.name} uri={user.profileImageUrl} /></Pressable>
            <View style={styles.greetingCopy}><Text style={styles.greeting}>Hello, {firstName} 👋</Text><Text style={styles.date}>{date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={notices.error ? 'Notifications, unread count unavailable' : `Notifications, ${unread} unread`} onPress={onNotifications} style={styles.bell}><Ionicons name="notifications-outline" size={23} color={c.dark} />{!notices.error && unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text></View>}{!!notices.error && <Text style={styles.badgeTextError}>!</Text>}</Pressable>
          </View>
          <Text accessibilityRole="header" style={styles.title}>{administrator ? 'Your services.' : 'Love Your Ride.'}</Text><Text style={styles.subtitle}>{administrator ? 'Ready to manage.' : 'We’ll Handle the Care.'}</Text>
          <View style={styles.search}><View style={styles.searchIcon}><Ionicons name="search-outline" size={22} color="white" /></View><TextInput accessibilityLabel="Search services by name" value={query} onChangeText={setQuery} placeholder="Search services..." placeholderTextColor={c.muted} style={styles.searchInput} autoCorrect={false} maxLength={80} returnKeyType="search" onSubmitEditing={openAll} />{!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} style={styles.iconButton}><Ionicons name="close" size={19} color={c.muted} /></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel="Filter and sort services" onPress={() => { setDraft(filters); setFilterError(''); setShowFilters(true); }} style={styles.iconButton}><Ionicons name="options-outline" size={22} color={c.dark} /></Pressable></View>
        </View>
        {!administrator && !all && <>
          {promotions.loading ? <Feedback title="Loading promotions" busy /> : promotions.error ? <Feedback title="Promotions unavailable" message={promotions.error} onRetry={promotions.refresh} /> : promotions.value.length > 0 && <View style={styles.promotions} onLayout={event => setBannerWidth(event.nativeEvent.layout.width)}>
            <ScrollView ref={carousel} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={event => setPromoIndex(Math.max(0, Math.min(promotions.value.length - 1, Math.round(event.nativeEvent.contentOffset.x / bannerWidth))))}>
              {promotions.value.map(item => <Pressable accessibilityRole="button" accessibilityLabel={`View promotion: ${item.name}`} key={item.id} onPress={() => onView(item.id)} style={{ width: bannerWidth }}><PromotionBanner imageUrl={item.promoImageUrl} text={item.promoText} name={item.name} /></Pressable>)}
            </ScrollView>
            {promotions.value.length > 1 && <View style={styles.dots}>{promotions.value.map((item, index) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Promotion ${index + 1} of ${promotions.value.length}`} accessibilityState={{ selected: index === promoIndex }} style={styles.dotTarget} onPress={() => { carousel.current?.scrollTo({ x: bannerWidth * index, animated: true }); setPromoIndex(index); }}><View style={[styles.dot, index === promoIndex && styles.activeDot]} /></Pressable>)}</View>}
          </View>}
          <View style={styles.section}><Text style={styles.sectionHeading}>Quick Access</Text></View>
          {recent.loading ? <Feedback title="Loading recent services" busy /> : recent.error ? <Feedback title="Recent services unavailable" message={recent.error} onRetry={recent.refresh} /> : recent.value.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>{recent.value.map(item => <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.name}`} key={item.id} style={styles.quickCard} onPress={() => onView(item.id)}><ServiceImage uri={item.imageUrl} name={item.name} height={56} /><Text style={styles.quickName} numberOfLines={2}>{item.name}</Text></Pressable>)}</ScrollView> : <Text style={styles.emptyNote}>Your recently completed services will appear here.</Text>}
        </>}
        <View style={styles.section}>
          {administrator && <><Action title="Add Service" icon="add" onPress={onAdd} /><Action title="Customer promotions" icon="images-outline" secondary onPress={onPromotions} /></>}
          <View style={styles.sectionRow}><Text accessibilityRole="header" style={styles.sectionHeading}>{administrator ? 'Manage services' : all ? 'All services' : 'Popular'}</Text>{!administrator && !all ? <Pressable accessibilityRole="button" onPress={openAll} style={styles.textButton}><Text style={styles.link}>See all</Text></Pressable> : <Pressable accessibilityRole="button" accessibilityLabel="Refresh services" onPress={services.refresh} style={styles.iconButton}><Ionicons name="refresh-outline" size={22} color={c.green} /></Pressable>}</View>
          {filtered && <Action title="Clear search and filters" secondary onPress={() => { setFilters(defaults); setQuery(''); setSearch(''); }} />}
        </View>
      </>}
      ListEmptyComponent={source.loading || (all && search !== query.trim()) ? <Feedback title="Loading services" busy /> : source.error ? <Feedback title="Services unavailable" message={source.error} onRetry={source.refresh} /> : <Feedback title={all ? (filtered ? 'No matching services' : 'No services yet') : 'No popular services yet'} message={all ? 'Try another search or check back for services.' : 'Services will appear here as confirmed and completed bookings are recorded.'} />}
      renderItem={({ item }) => <View style={[styles.cardSlot, { width: columns === 2 ? '50%' : '100%' }]}><View style={styles.card}>
        <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.name}, ${formatPrice(item.price)}`} onPress={() => onView(item.id)} style={styles.cardMain}><ServiceImage uri={item.imageUrl} name={item.name} height={columns === 2 ? 114 : 170} /><Text style={styles.serviceName} numberOfLines={2}>{item.name}</Text><View style={styles.cardBottom}><Text style={styles.price}>{formatPrice(item.price)}</Text><View style={styles.arrow}><Ionicons name="arrow-forward" size={17} color={c.dark} /></View></View></Pressable>
        {administrator && <View style={styles.adminActions}><Action title="Edit" icon="create-outline" secondary onPress={() => onEdit(item.id)} /><Action title="Delete" icon="trash-outline" secondary onPress={() => onDelete(item)} /></View>}
      </View></View>}
    />
    <View style={styles.nav}>{(!administrator && [{ title: 'Home', icon: 'home-outline' as const, press: openHome, active: !all }] || []).map(item => <Pressable key={item.title} accessibilityRole="button" accessibilityState={{ selected: item.active }} accessibilityLabel={item.title} onPress={item.press} style={styles.navButton}><Ionicons name={item.icon} size={22} color={item.active ? c.orange : c.muted} /><Text style={[styles.navLabel, item.active && { color: c.orange }]}>{item.title}</Text></Pressable>)}<Pressable accessibilityRole="button" accessibilityState={{ selected: all }} accessibilityLabel="Services" onPress={openAll} style={styles.navButton}><Ionicons name="grid-outline" size={22} color={all ? c.orange : c.muted} /><Text style={[styles.navLabel, all && { color: c.orange }]}>Services</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Appointments" onPress={onAppointments} style={styles.navButton}><Ionicons name="calendar-outline" size={22} color={c.muted} /><Text style={styles.navLabel}>Bookings</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Log out" onPress={() => setConfirmLogout(true)} style={styles.navButton}><Ionicons name="log-out-outline" size={22} color={c.muted} /><Text style={styles.navLabel}>Log out</Text></Pressable></View>
    <Modal visible={confirmLogout} transparent animationType="fade" onRequestClose={() => setConfirmLogout(false)}>
      <View style={styles.logoutBackdrop}><View style={styles.logoutDialog}>
        <Text style={styles.logoutTitle}>Log out?</Text>
        <Text style={styles.logoutMessage}>Are you sure you want to log out?</Text>
        <View style={styles.logoutActions}><Pressable accessibilityRole="button" accessibilityLabel="Cancel logout" onPress={() => setConfirmLogout(false)} style={styles.logoutCancel}><Text style={styles.logoutCancelText}>Cancel</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Confirm logout" onPress={() => { setConfirmLogout(false); onLogout(); }} style={styles.logoutConfirm}><Text style={styles.logoutConfirmText}>Log out</Text></Pressable></View>
      </View></View>
    </Modal>
    <Modal visible={showFilters} animationType="slide" onRequestClose={() => setShowFilters(false)}><SafeAreaView style={[ui.safe, { backgroundColor: c.cream }]}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}><Text style={ui.heading}>Filter services</Text><Text style={ui.body}>Prices in LKR</Text>{(['min', 'max'] as const).map(key => <View key={key}><Text style={styles.label}>{key === 'min' ? 'Minimum price' : 'Maximum price'}</Text><TextInput accessibilityLabel={key === 'min' ? 'Minimum price' : 'Maximum price'} value={draft[key]} onChangeText={value => setDraft(current => ({ ...current, [key]: value }))} keyboardType="decimal-pad" placeholder="No limit" placeholderTextColor={c.muted} style={styles.input} /></View>)}<Text style={styles.label}>Sort by</Text><Action title="Service name" secondary={draft.sort !== 'name'} onPress={() => setDraft(current => ({ ...current, sort: 'name' }))} /><Action title="Price" secondary={draft.sort !== 'price'} onPress={() => setDraft(current => ({ ...current, sort: 'price' }))} /><Action title={draft.order === 'asc' ? 'Ascending' : 'Descending'} secondary onPress={() => setDraft(current => ({ ...current, order: current.order === 'asc' ? 'desc' : 'asc' }))} />{!!filterError && <Text accessibilityRole="alert" style={ui.error}>{filterError}</Text>}<Action title="Apply filters" onPress={applyFilters} /><Action title="Reset filters" secondary onPress={() => { setDraft(defaults); setFilterError(''); }} /><Action title="Cancel" secondary onPress={() => setShowFilters(false)} /></ScrollView></KeyboardAvoidingView></SafeAreaView></Modal>
  </View></SafeAreaView>;
}

const styles = StyleSheet.create({
  list: { paddingBottom: 24, width: '100%', maxWidth: 840, alignSelf: 'center', flexGrow: 1 },
  header: { backgroundColor: c.green, padding: 16, paddingTop: 10, paddingBottom: 16, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, brand: { flexDirection: 'row', alignItems: 'center', gap: 7 }, brandLogo: { width: 58, height: 32, borderRadius: 8 }, brandText: { color: 'white', fontSize: 18, fontWeight: '700' }, adminLabel: { color: '#C6DED2', fontSize: 10, letterSpacing: 1 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 18 }, greetingCopy: { flex: 1 }, greeting: { color: '#fff', fontSize: 18, lineHeight: 25, fontWeight: '700' }, date: { color: '#C6DED2', fontSize: 12, lineHeight: 18, marginTop: 3 }, avatarButton: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  bell: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, badge: { position: 'absolute', top: -3, right: -3, borderRadius: 12, minWidth: 21, minHeight: 21, paddingHorizontal: 4, backgroundColor: '#AF283B', alignItems: 'center', justifyContent: 'center' }, badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' }, badgeTextError: { position: 'absolute', top: 0, right: 3, color: '#AF283B', fontWeight: '700' },
  title: { fontSize: 30, lineHeight: 37, color: '#fff', letterSpacing: -0.7, fontWeight: '800' }, subtitle: { fontSize: 30, lineHeight: 37, color: '#AACABA', letterSpacing: -0.7, fontWeight: '800' },
  search: { marginTop: 20, borderRadius: 28, minHeight: 54, padding: 4, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 4 }, searchIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E75D00', alignItems: 'center', justifyContent: 'center' }, searchInput: { minWidth: 0, flex: 1, minHeight: 46, color: c.dark, fontSize: 14 }, iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  promotions: { marginHorizontal: 14, marginTop: 16 }, dots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }, dotTarget: { minWidth: 44, height: 44, justifyContent: 'center', alignItems: 'center' }, dot: { height: 6, width: 6, borderRadius: 3, backgroundColor: '#B7A89A' }, activeDot: { width: 16, backgroundColor: c.orange },
  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, gap: 10 }, sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, sectionHeading: { fontSize: 18, color: c.dark, fontWeight: '600', flexShrink: 1 }, textButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }, link: { color: c.green, fontSize: 13, textDecorationLine: 'underline' },
  quickRow: { paddingHorizontal: 14, gap: 10 }, quickCard: { width: 96, backgroundColor: '#fff', padding: 7, borderRadius: 16, gap: 7 }, quickName: { color: c.dark, fontSize: 12, lineHeight: 16, minHeight: 32 }, emptyNote: { paddingHorizontal: 16, color: c.muted, fontSize: 14, lineHeight: 21 },
  logoutBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.55)' }, logoutDialog: { width: '100%', maxWidth: 380, padding: 22, borderRadius: 20, backgroundColor: c.white, gap: 10 }, logoutTitle: { color: c.dark, fontSize: 21, fontWeight: '800' }, logoutMessage: { color: c.muted, fontSize: 15, lineHeight: 22 }, logoutActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }, logoutCancel: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' }, logoutCancelText: { color: c.green, fontWeight: '700' }, logoutConfirm: { minHeight: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: c.orange, justifyContent: 'center' }, logoutConfirmText: { color: c.white, fontWeight: '700' },
  columns: { paddingHorizontal: 8 }, cardSlot: { paddingHorizontal: 6, paddingBottom: 12 }, card: { backgroundColor: '#fff', borderRadius: 22, padding: 9, flex: 1, shadowColor: '#1A2D23', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 1 }, cardMain: { gap: 9 }, serviceName: { fontSize: 14, lineHeight: 20, color: c.dark, fontWeight: '600' }, cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 3, justifyContent: 'space-between' }, price: { color: c.muted, fontSize: 12, lineHeight: 19, flex: 1 }, arrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FF780A', alignItems: 'center', justifyContent: 'center' }, adminActions: { marginTop: 14, gap: 8 },
  nav: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E4E2DC', paddingVertical: 5 }, navButton: { flex: 1, minHeight: 54, paddingVertical: 5, gap: 4, alignItems: 'center', justifyContent: 'center' }, navLabel: { fontSize: 10, color: c.muted, textAlign: 'center' }, label: { color: c.dark, fontWeight: '600', marginBottom: 8 }, input: { backgroundColor: '#fff', borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14, minHeight: 52, color: c.dark },
});
