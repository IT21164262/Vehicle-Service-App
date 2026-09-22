import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { AdministratorHomeScreen, CustomerHomeScreen } from './src/screens/ServiceHomeScreen';
import { ServiceDetailScreen } from './src/screens/ServiceDetailScreen';
import { PromotionScreen } from './src/screens/PromotionScreen';
import { ServiceFormScreen } from './src/screens/ServiceFormScreen';
import { AuthUser, getCurrentUser, logout, restoreSession, subscribeSession } from './src/services/authApi';
import { allowedRoute, ProtectedRoute } from './src/navigation';
import { deleteService, Service } from './src/services/serviceApi';
import { AppointmentFormScreen } from './src/screens/AppointmentFormScreen';
import { AppointmentScreen } from './src/screens/AppointmentScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { AppointmentDetailScreen } from './src/screens/AppointmentDetailScreen';
import { Action, Feedback, serviceColors, ui } from './src/components/ServiceUI';
import { useForegroundRefresh } from './src/hooks/useForegroundRefresh';

const loadingStyles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: serviceColors.cream, gap: 14 },
  loadingText: { color: serviceColors.dark, fontSize: 15 },
});

export default function App() {
  const [screen, setScreen] = useState<'welcome' | 'login' | 'signup'>('welcome');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [requestedRoute, setRoute] = useState<ProtectedRoute>({ name: 'home' });
  const route = allowedRoute(user, requestedRoute) || { name: 'home' as const };
  const [revision, setRevision] = useState(0);
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState('');
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [logoutError, setLogoutError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  useForegroundRefresh(() => { if (user) void getCurrentUser().catch(() => undefined); });
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (deleteTarget) { if (!deleting) setDeleteTarget(null); return true; }
      if (user && route.name !== 'home') { setRoute(route.name === 'appointmentDetail' ? { name: 'notifications' } : { name: 'home' }); return true; }
      if (!user && screen !== 'welcome') { setScreen('welcome'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [user, route.name, screen, deleteTarget, deleting]);
  useEffect(() => {
    let active = true;
    setRestoring(true); setRestoreError('');
    void restoreSession().then(restored => {
      if (active && restored) setUser(restored);
    }).catch(() => {
      if (active) setRestoreError('Unable to check your saved session. Check your connection and retry.');
    }).finally(() => {
      if (active) setRestoring(false);
    });
    return () => { active = false; };
  }, [restoreAttempt]);
  useEffect(() => subscribeSession(nextUser => {
    setUser(nextUser);
    if (!nextUser) {
      setRoute({ name: 'home' });
      setScreen('welcome');
      setDeleteTarget(null);
    }
  }), []);

  async function handleLogout() {
    setLogoutError('');
    setRestoreError('');
    setUser(null); setRoute({ name: 'home' }); setScreen('welcome'); setDeleteTarget(null);
    try { await logout(); }
    catch { setLogoutError('Unable to clear saved session storage. Retry logout before closing the app.'); }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true); setDeleteError('');
    try { await deleteService(deleteTarget.id); setDeleteTarget(null); setRevision(value => value + 1); }
    catch (failure) { setDeleteError(failure instanceof Error ? failure.message : 'Unable to delete service.'); }
    finally { setDeleting(false); }
  }

  function goProtected(nextRoute: ProtectedRoute) {
    const safeRoute = allowedRoute(user, nextRoute);
    if (safeRoute) setRoute(safeRoute);
  }

  if (restoring) {
    return <SafeAreaProvider><View style={loadingStyles.loading}><ActivityIndicator size="large" color={serviceColors.green} /><Text style={loadingStyles.loadingText}>Restoring your session...</Text></View></SafeAreaProvider>;
  }
  if (logoutError) return <SafeAreaProvider><Feedback title="Logout needs attention" message={logoutError} onRetry={handleLogout} /></SafeAreaProvider>;
  if (restoreError) return <SafeAreaProvider><View style={loadingStyles.loading}><Feedback title="Connection unavailable" message={restoreError} onRetry={() => setRestoreAttempt(value => value + 1)} /><Action title="Log out" secondary onPress={handleLogout} /></View></SafeAreaProvider>;

  if (user) {
    if (route.name === 'home') {
      const Home = user.isAdmin ? AdministratorHomeScreen : CustomerHomeScreen;
      return <SafeAreaProvider><StatusBar style="light" /><Home user={user} onView={id => goProtected({ name: 'detail', id })} onEdit={id => goProtected({ name: 'edit', id })} onAdd={() => goProtected({ name: 'add' })} onPromotions={() => goProtected({ name: 'promotions' })} onAppointments={() => goProtected({ name: 'appointments' })} onProfile={() => goProtected({ name: 'profile' })} onNotifications={() => goProtected({ name: 'notifications' })} onDelete={service => { setDeleteError(''); setDeleteTarget(service); }} onLogout={handleLogout} revision={revision} />
        <Modal visible={!!deleteTarget && user.isAdmin} transparent animationType="fade" onRequestClose={() => { if (!deleting) setDeleteTarget(null); }}><View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 24 }}><ScrollView style={{ maxHeight: '80%' }} contentContainerStyle={ui.card}><Text style={ui.heading}>Delete service?</Text><Text style={ui.body}>Remove {deleteTarget?.name}? Services referenced by appointments cannot be deleted.</Text>{!!deleteError && <Text accessibilityRole="alert" style={ui.error}>{deleteError}</Text>}<Action title="Delete service" danger busy={deleting} onPress={confirmDelete} /><Action title="Cancel" secondary disabled={deleting} onPress={() => setDeleteTarget(null)} /></ScrollView></View></Modal>
      </SafeAreaProvider>;
    }
    if (route.name === 'promotions') return <SafeAreaProvider><StatusBar style="light" /><PromotionScreen onBack={() => goProtected({ name: 'home' })} onLogout={handleLogout} onAddService={() => goProtected({ name: 'add' })} /></SafeAreaProvider>;
    if (route.name === 'detail') {
      return <SafeAreaProvider><StatusBar style="light" /><ServiceDetailScreen id={route.id} administrator={user.isAdmin} onBack={() => goProtected({ name: 'home' })} onEdit={id => goProtected({ name: 'edit', id })} onBook={id => goProtected({ name: 'book', serviceId: id })} onLogout={handleLogout} /></SafeAreaProvider>;
    }
    if (route.name === 'appointments') return <SafeAreaProvider><StatusBar style="light" /><AppointmentScreen administrator={user.isAdmin} onBack={() => goProtected({ name: 'home' })} onEdit={item => goProtected({ name: 'editAppointment', appointment: item })} onLogout={handleLogout} /></SafeAreaProvider>;
    if (route.name === 'book') return <SafeAreaProvider><StatusBar style="light" /><AppointmentFormScreen user={user} serviceId={route.serviceId} onBack={() => goProtected({ name: 'appointments' })} onSaved={() => goProtected({ name: 'appointments' })} onLogout={handleLogout} /></SafeAreaProvider>;
    if (route.name === 'editAppointment') return <SafeAreaProvider><StatusBar style="light" /><AppointmentFormScreen user={user} serviceId={route.appointment.serviceId} appointment={route.appointment} onBack={() => goProtected({ name: 'appointments' })} onSaved={() => goProtected({ name: 'appointments' })} onLogout={handleLogout} /></SafeAreaProvider>;
    if (route.name === 'profile') return <SafeAreaProvider><StatusBar style="light" /><ProfileScreen user={user} onBack={() => goProtected({ name: 'home' })} onLogout={handleLogout} onUpdated={setUser} /></SafeAreaProvider>;
    if (route.name === 'notifications') return <SafeAreaProvider><StatusBar style="light" /><NotificationsScreen onBack={() => goProtected({ name: 'home' })} onLogout={handleLogout} onOpenAppointment={id => goProtected({ name: 'appointmentDetail', id })} /></SafeAreaProvider>;
    if (route.name === 'appointmentDetail') return <SafeAreaProvider><StatusBar style="light" /><AppointmentDetailScreen id={route.id} onBack={() => goProtected({ name: 'notifications' })} onLogout={handleLogout} onService={id => goProtected({ name: 'detail', id })} /></SafeAreaProvider>;
    return <SafeAreaProvider><StatusBar style="light" /><ServiceFormScreen id={route.name === 'edit' ? route.id : undefined} onBack={() => goProtected({ name: 'home' })} onSaved={() => { setRevision(value => value + 1); goProtected({ name: 'home' }); }} onLogout={handleLogout} /></SafeAreaProvider>;
  }

  if (screen === 'login') {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <LoginScreen
          onBack={() => setScreen('welcome')}
          onSwitchToSignUp={() => setScreen('signup')}
          onAuthenticated={authenticatedUser => { setUser(authenticatedUser); setRoute({ name: 'home' }); }}
        />
      </SafeAreaProvider>
    );
  }


  if (screen === 'signup') {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SignUpScreen
          onBack={() => setScreen('welcome')}
          onSwitchToLogin={() => setScreen('login')}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <WelcomeScreen
        onLogin={() => setScreen('login')}
        onSignUp={() => setScreen('signup')}
      />
    </SafeAreaProvider>
  );
}
