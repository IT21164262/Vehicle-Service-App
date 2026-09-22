import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export const serviceColors = { green: '#00543F', dark: '#143D32', muted: '#5E6962', cream: '#F1ECE7', white: '#FFFFFF', orange: '#BE4600', pale: '#E3EEE7', border: '#D5DCD5', error: '#A62132' };
export const formatPrice = (price: number) => `LKR ${price.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function Action({ title, icon, onPress, secondary = false, danger = false, busy = false, disabled = false }: {
  title: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void; secondary?: boolean; danger?: boolean; busy?: boolean; disabled?: boolean;
}) {
  const foreground = secondary ? serviceColors.dark : serviceColors.white;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [ui.action, secondary && ui.secondary, danger && { backgroundColor: serviceColors.error }, (pressed || disabled || busy) && { opacity: 0.65 }]}>
    {busy ? <ActivityIndicator color={foreground} /> : icon ? <Ionicons name={icon} size={20} color={foreground} /> : null}
    <Text style={[ui.actionText, { color: foreground }]}>{title}</Text>
  </Pressable>;
}

export function ServiceImage({ uri, name, large = false, height }: { uri: string; name: string; large?: boolean; height?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return <View style={[ui.image, large && { height: 220 }, height !== undefined && { height }]}>
    {uri && !failed ? <Image source={{ uri }} accessibilityLabel={name} resizeMode="cover" style={StyleSheet.absoluteFill} onError={() => setFailed(true)} /> : <View style={ui.placeholder}>
      <Ionicons name="car-sport-outline" size={height && height < 80 ? 24 : large ? 64 : 40} color={serviceColors.green} />
      <Text style={[ui.placeholderText, height !== undefined && height < 80 && { fontSize: 9 }]}>{uri ? 'Image unavailable' : 'No image yet'}</Text>
    </View>}
  </View>;
}

export function Feedback({ title, message, busy = false, onRetry }: { title: string; message?: string; busy?: boolean; onRetry?: () => void }) {
  return <View style={ui.feedback} accessibilityLiveRegion="polite">
    {busy ? <ActivityIndicator size="large" color={serviceColors.green} /> : <Ionicons name={onRetry ? 'cloud-offline-outline' : 'car-outline'} size={34} color={serviceColors.green} />}
    <Text style={ui.heading}>{title}</Text>
    {!!message && <Text style={ui.body}>{message}</Text>}
    {onRetry && <Action title="Retry" icon="refresh-outline" onPress={onRetry} />}
  </View>;
}

export function PageHeader({ title, onBack, disabled = false }: { title: string; onBack: () => void; disabled?: boolean }) {
  return <View style={ui.pageHeader}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back to services" disabled={disabled} onPress={onBack} style={ui.headerButton}><Ionicons name="arrow-back" size={22} color="white" /><Text style={ui.headerButtonText}>Back</Text></Pressable>
    <Image source={require('../../assets/autonexa-vehicle-logo.png')} style={ui.headerLogo} accessibilityLabel="AutoNexa vehicle logo" />
    <Text accessibilityRole="header" style={ui.pageTitle}>{title}</Text>
  </View>;
}

export const ui = StyleSheet.create({
  safe: { flex: 1, backgroundColor: serviceColors.green },
  screen: { flex: 1, backgroundColor: serviceColors.cream },
  content: { padding: 20, paddingBottom: 36, gap: 20, width: '100%', maxWidth: 760, alignSelf: 'center' },
  action: { minHeight: 48, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: serviceColors.orange, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  secondary: { backgroundColor: serviceColors.white, borderWidth: 1, borderColor: serviceColors.border },
  actionText: { fontSize: 15, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  heading: { color: serviceColors.dark, fontSize: 22, fontWeight: '700', flexShrink: 1 },
  body: { color: serviceColors.muted, fontSize: 15, lineHeight: 23 },
  error: { color: serviceColors.error, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: serviceColors.white, borderRadius: 24, padding: 16, gap: 12 },
  image: { height: 130, borderRadius: 17, overflow: 'hidden', backgroundColor: serviceColors.pale },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  placeholderText: { color: serviceColors.muted, fontSize: 12 },
  feedback: { padding: 26, alignItems: 'center', gap: 16 },
  pageHeader: { backgroundColor: serviceColors.green, paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  pageTitle: { color: 'white', fontSize: 19, fontWeight: '600', flex: 1, minWidth: 100 },
  headerLogo: { width: 58, height: 30, borderRadius: 8 },
  headerButton: { minHeight: 48, paddingHorizontal: 4, gap: 6, flexDirection: 'row', alignItems: 'center' },
  headerButtonText: { color: 'white', fontSize: 14, flexShrink: 1 },
});
