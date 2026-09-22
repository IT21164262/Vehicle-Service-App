import { useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Animated, ImageBackground, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

const { colors, spacing, radius } = theme;

type WelcomeScreenProps = {
  onLogin: () => void;
  onSignUp: () => void;
};

export function WelcomeScreen({ onLogin, onSignUp }: WelcomeScreenProps) {
  const [aboutVisible, setAboutVisible] = useState(false);
  const { height } = useWindowDimensions();
  const pageHeight = Math.max(560, height - 32);
  const [sliderWidth, setSliderWidth] = useState(0);
  const sliderPosition = useRef(new Animated.Value(0)).current;
  const sliderStart = useRef(0);
  const thumbSize = 52;
  const maxSlide = Math.max(0, sliderWidth - thumbSize - 10);
  const maxSlideRef = useRef(0);
  maxSlideRef.current = maxSlide;
  const resetSlider = () => Animated.spring(sliderPosition, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
  const sliderResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 3,
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) > 3,
    onPanResponderGrant: () => {
      sliderPosition.stopAnimation(value => { sliderStart.current = value; });
    },
    onPanResponderMove: (_, gesture) => {
      const limit = maxSlideRef.current;
      const next = Math.min(limit, Math.max(0, sliderStart.current + gesture.dx));
      sliderPosition.setValue(next);
    },
    onPanResponderRelease: (_, gesture) => {
      const limit = maxSlideRef.current;
      const finalPosition = Math.min(limit, Math.max(0, sliderStart.current + gesture.dx));
      if (limit > 0 && finalPosition >= limit * 0.82) {
        Animated.timing(sliderPosition, { toValue: limit, duration: 140, useNativeDriver: true }).start(() => {
          onSignUp();
          resetSlider();
        });
      } else {
        resetSlider();
      }
    },
    onPanResponderTerminate: resetSlider,
  })).current;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ImageBackground
          source={require('../../assets/autonexa-welcome-background.png')}
          resizeMode="cover"
          style={[styles.page, { height: pageHeight }]}
          imageStyle={{ borderRadius: 38 }}
          accessible
          accessibilityLabel="Green sports car for AutoNexa"
        >
          <View style={styles.overlay} />
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

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log in to AutoNexa"
              onPress={onLogin}
              style={({ pressed }) => [styles.loginButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.loginText}>Login</Text>
            </Pressable>

            <View
              style={styles.slider}
              onLayout={event => setSliderWidth(event.nativeEvent.layout.width)}
              accessibilityRole="adjustable"
              accessibilityLabel="Slide to get started"
            >
              <Text style={styles.sliderHint}>Slide to get started</Text>
              <Animated.View
                {...sliderResponder.panHandlers}
                style={[styles.sliderThumb, { transform: [{ translateX: sliderPosition }] }]}
              >
                <Ionicons name="arrow-forward" size={21} color={colors.surface} />
              </Animated.View>
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
        </ImageBackground>
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
  safeArea: { flex: 1, backgroundColor: '#063E2C' },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  page: { width: '100%', maxWidth: 600, alignSelf: 'center', margin: spacing.md, overflow: 'hidden', borderRadius: 38, borderWidth: 1, borderColor: '#FF8A3D', justifyContent: 'flex-end' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 35, 25, 0.02)' },
  content: { padding: spacing.lg, paddingTop: 110, backgroundColor: 'rgba(0, 0, 0, 0.08)' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  brandMark: { backgroundColor: colors.navy, padding: 7, borderRadius: 12 },
  brandName: { color: colors.surface, fontSize: 18, fontWeight: '700' },
  title: { color: colors.surface, fontSize: 32, lineHeight: 40, fontWeight: '800', letterSpacing: -0.7 },
  description: { color: colors.surface, fontSize: 14, lineHeight: 20, marginTop: spacing.md },
  loginButton: { alignSelf: 'flex-start', minHeight: 50, marginTop: spacing.lg, paddingHorizontal: spacing.lg, borderRadius: 26, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.surface },
  loginText: { color: colors.surface, fontSize: 14, fontWeight: '600' },
  slider: { minHeight: 62, marginTop: spacing.md, padding: 5, borderRadius: 32, backgroundColor: 'rgba(255, 255, 255, 0.96)', justifyContent: 'center', overflow: 'hidden' },
  sliderHint: { color: colors.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  sliderThumb: { position: 'absolute', left: 5, top: 5, width: 52, height: 52, borderRadius: 26, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  startButtonPressed: { opacity: 0.8 },
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
