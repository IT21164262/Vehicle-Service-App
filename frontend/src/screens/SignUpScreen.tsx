import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { register } from '../services/authApi';

const { colors, spacing, radius, typography } = theme;

type SignUpScreenProps = {
  onBack: () => void;
  onSwitchToLogin: () => void;
};

export function SignUpScreen({ onBack, onSwitchToLogin }: SignUpScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignUp() {
    setError('');
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Complete all fields to create your account.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name, email, password);
      onSwitchToLogin();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create your account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.page}>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.header}>
            <View style={styles.iconShell}>
              <Ionicons name="create-outline" size={40} color={colors.blue} />
            </View>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Sign up to book vehicle services.</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="John Smith"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              value={name}
              onChangeText={setName}
            />

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
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              placeholderTextColor={colors.muted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor={colors.muted}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting }}
              disabled={isSubmitting}
              onPress={handleSignUp}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, isSubmitting && styles.disabledButton]}
            >
              {isSubmitting ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryButtonText}>Create account</Text>}
            </Pressable>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable accessibilityRole="button" onPress={onSwitchToLogin}>
              <Text style={styles.linkText}>Log in</Text>
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
