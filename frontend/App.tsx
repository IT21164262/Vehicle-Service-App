import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { AdministratorHomeScreen, CustomerHomeScreen } from './src/screens/ServiceHomeScreen';
import { ServiceDetailScreen } from './src/screens/ServiceDetailScreen';
import { ServiceFormScreen } from './src/screens/ServiceFormScreen';
import { AuthUser, logout, restoreSession, subscribeSession } from './src/services/authApi';
import { allowedRoute, ProtectedRoute } from './src/navigation';
import { deleteService, Service } from './src/services/serviceApi';
import { serviceColors } from './src/components/ServiceUI';

const loadingStyles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: serviceColors.cream, gap: 14 },
  loadingText: { color: serviceColors.dark, fontSize: 15 },
});

export default function App() {
  const [screen, setScreen] = useState<'welcome' | 'login' | 'signup'>('welcome');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [route, setRoute] = useState<ProtectedRoute>({ name: 'home' });
  const [revision, setRevision] = useState(0);
  const [restoring, setRestoring] = useState(true);
  useEffect(() => {
    let active = true;
    void restoreSession().then(restored => {
      if (active && restored) setUser(restored);
    }).catch(() => {
      // The token remains available for a later retry if the backend is offline.
    }).finally(() => {
      if (active) setRestoring(false);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => subscribeSession(nextUser => {
    setUser(nextUser);
    if (!nextUser) {
      setRoute({ name: 'home' });
      setScreen('welcome');
    }
  }), []);

  async function handleLogout() {
    await logout();
  }

  function goProtected(nextRoute: ProtectedRoute) {
    const safeRoute = allowedRoute(user, nextRoute);
    if (safeRoute) setRoute(safeRoute);
  }

  if (restoring) {
    return <SafeAreaProvider><View style={loadingStyles.loading}><ActivityIndicator size="large" color={serviceColors.green} /><Text style={loadingStyles.loadingText}>Restoring your session...</Text></View></SafeAreaProvider>;
  }

  if (user) {
    if (route.name === 'home') {
      const Home = user.isAdmin ? AdministratorHomeScreen : CustomerHomeScreen;
      return <SafeAreaProvider><StatusBar style="light" /><Home user={user} onView={id => goProtected({ name: 'detail', id })} onEdit={id => goProtected({ name: 'edit', id })} onAdd={() => goProtected({ name: 'add' })} onDelete={async (service: Service) => {
        Alert.alert('Delete service?', `Remove ${service.name}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
          try { await deleteService(service.id); setRevision(value => value + 1); }
          catch (error) { Alert.alert('Unable to delete service', error instanceof Error ? error.message : 'Please try again.'); }
        }}]);
      }} onLogout={handleLogout} revision={revision} /></SafeAreaProvider>;
    }
    if (route.name === 'detail') {
      return <SafeAreaProvider><StatusBar style="light" /><ServiceDetailScreen id={route.id} administrator={user.isAdmin} onBack={() => goProtected({ name: 'home' })} onEdit={id => goProtected({ name: 'edit', id })} onLogout={handleLogout} /></SafeAreaProvider>;
    }
    return <SafeAreaProvider><StatusBar style="dark" /><ServiceFormScreen id={route.name === 'edit' ? route.id : undefined} onBack={() => goProtected({ name: 'home' })} onSaved={() => { setRevision(value => value + 1); goProtected({ name: 'home' }); }} onLogout={handleLogout} /></SafeAreaProvider>;
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
