import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

const { colors, spacing, radius } = theme;

type WelcomeScreenProps = {
  onLogin: () => void;
  onSignUp: () => void;
};

export function WelcomeScreen({ onLogin, onSignUp }: WelcomeScreenProps) {
  const [aboutVisible, setAboutVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.page}>
          <View style={styles.imagePlaceholder} accessible accessibilityLabel="AutoNexa vehicle image placeholder">
            <View style={styles.placeholderCar}>
              <Ionicons name="car-sport-outline" size={150} color={colors.onNavy} />
            </View>
            <View style={styles.placeholderCurve} />
          </View>

          <View style={styles.content}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Ionicons name="car-sport-outline" size={22} color={colors.surface} />
              </View>
              <Text style={styles.brandName}>AutoNexa</Text>
            </View>

            <Text style={styles.title} accessibilityRole="header">
              Reliable Auto Care{'\n'}Starts Here
            </Text>
            <Text style={styles.description}>
              Book trusted car services and repairs{'\n'}anytime, anywhere.
            </Text>

            <View style={styles.dots} accessible={false}>
              <View style={styles.dotActive} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Log in to AutoNexa"
                onPress={onLogin}
                style={({ pressed }) => [styles.loginButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.loginText}>Login</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Get started with AutoNexa"
                onPress={onSignUp}
                style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
              >
                <Text style={styles.startText}>Get Started</Text>
                <View style={styles.arrowCircle}>
                  <Ionicons name="arrow-forward" size={18} color={colors.surface} />
                </View>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="About AutoNexa"
              onPress={() => setAboutVisible(true)}
              style={({ pressed }) => [styles.aboutButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.aboutText}>About AutoNexa</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal visible={aboutVisible} transparent animationType="fade" onRequestClose={() => setAboutVisible(false)}>
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.modalCard} accessibilityViewIsModal>
            <Text style={styles.modalTitle}>AutoNexa</Text>
            <Text style={styles.modalDescription}>
              Book trusted car services and repairs anytime, anywhere.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setAboutVisible(false)}
              style={({ pressed }) => [styles.modalButton, pressed && styles.startButtonPressed]}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#6D751D' },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  page: { width: '100%', maxWidth: 600, alignSelf: 'center', minHeight: 720, margin: spacing.md, overflow: 'hidden', borderRadius: 38, borderWidth: 1, borderColor: '#FF8A3D', backgroundColor: colors.blue },
  imagePlaceholder: { height: 390, backgroundColor: colors.navy, position: 'relative', overflow: 'hidden' },
  placeholderCar: { flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-18deg' }] },
  placeholderCurve: { position: 'absolute', width: '150%', height: 180, bottom: -115, left: '-25%', borderRadius: 200, backgroundColor: colors.blue },
  content: { flex: 1, minHeight: 330, padding: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.blue },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  brandMark: { backgroundColor: colors.navy, padding: 7, borderRadius: 12 },
  brandName: { color: colors.surface, fontSize: 18, fontWeight: '700' },
  title: { color: colors.surface, fontSize: 32, lineHeight: 40, fontWeight: '800', letterSpacing: -0.7 },
  description: { color: colors.surface, fontSize: 14, lineHeight: 20, marginTop: spacing.md },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.lg },
  dotActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surface },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFB181' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  loginButton: { minHeight: 52, paddingHorizontal: spacing.md, borderRadius: 28, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.surface },
  loginText: { color: colors.surface, fontSize: 14, fontWeight: '600' },
  startButton: { flex: 1, minHeight: 58, paddingLeft: spacing.lg, paddingRight: 6, borderRadius: 30, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  startButtonPressed: { opacity: 0.8 },
  startText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  arrowCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  buttonPressed: { opacity: 0.75 },
  aboutButton: { alignSelf: 'flex-start', marginTop: spacing.md, paddingVertical: spacing.sm },
  aboutText: { color: '#FFE9D9', fontSize: 13, fontWeight: '600' },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: 'rgba(20, 61, 50, 0.72)' },
  modalCard: { width: '100%', maxWidth: 440, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.card },
  modalTitle: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: spacing.sm },
  modalDescription: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  modalButton: { minHeight: 52, marginTop: spacing.lg, borderRadius: radius.control, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  modalButtonText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
});
