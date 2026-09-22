import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { AuthUser, getCurrentUser, login } from '../services/authApi';

const { colors, spacing, radius, typography } = theme;

type LoginScreenProps = {
  onBack: () => void;
  onSwitchToSignUp: () => void;
  onAuthenticated: (user: AuthUser) => void;
};

export function LoginScreen({ onBack, onSwitchToSignUp, onAuthenticated }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleLogin() {
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      onAuthenticated(await getCurrentUser());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to log in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.page}>
          <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.header}>
            <View style={styles.iconShell}>
              <Ionicons name="person-circle-outline" size={40} color={colors.blue} />
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to manage your service appointments and driving care.</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              editable={!isSubmitting}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={colors.muted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!isSubmitting}
            />

            {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting }}
              disabled={isSubmitting}
              onPress={handleLogin}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, isSubmitting && styles.disabledButton]}
            >
              {isSubmitting ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryButtonText}>Log in</Text>}
            </Pressable>

          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Need an account?</Text>
            <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={onSwitchToSignUp}>
              <Text style={styles.linkText}>Sign up</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1 },
  page: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: spacing.lg, paddingTop: spacing.md },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: spacing.lg },
  backText: { color: colors.text, fontSize: typography.body, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  iconShell: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 32, fontWeight: '700', letterSpacing: -0.8, marginBottom: spacing.sm },
  subtitle: { color: colors.muted, fontSize: typography.body, lineHeight: 24, textAlign: 'center', maxWidth: 360 },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, shadowColor: colors.navy, shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  label: { color: colors.text, fontSize: typography.label, fontWeight: '600', marginBottom: spacing.sm },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, minHeight: 52, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.body, color: colors.text, marginBottom: spacing.md },
  primaryButton: { minHeight: 56, borderRadius: radius.control, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  primaryButtonPressed: { backgroundColor: colors.bluePressed },
  primaryButtonText: { color: colors.surface, fontSize: typography.body, fontWeight: '700' },
  disabledButton: { opacity: 0.65 },
  errorText: { color: colors.error, fontSize: typography.label, lineHeight: 20, marginBottom: spacing.sm },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  footerText: { color: colors.muted, fontSize: typography.body },
  linkText: { color: colors.blue, fontSize: typography.body, fontWeight: '700' },
});
