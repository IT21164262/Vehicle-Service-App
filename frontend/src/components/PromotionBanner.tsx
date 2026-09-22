import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export function PromotionBanner({ imageUrl, text, name }: { imageUrl: string; text: string; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [imageUrl]);
  return <View style={styles.banner}>
    {imageUrl && !failed ? <Image source={{ uri: imageUrl }} resizeMode="cover" style={StyleSheet.absoluteFill} onError={() => setFailed(true)} accessibilityLabel={`Promotion: ${name}`} /> : <View style={styles.placeholder}><Ionicons name="car-sport-outline" size={80} color="#FFC99E" /><Text style={styles.imageNote}>{imageUrl ? 'Image unavailable' : 'No promotion image'}</Text></View>}
    <View style={styles.copy}><Text style={styles.title} numberOfLines={3}>{text || name || 'Promotion preview'}</Text><Text style={styles.cta}>View service <Ionicons name="arrow-forward" size={14} /></Text></View>
  </View>;
}
const styles = StyleSheet.create({
  banner: { minHeight: 170, borderRadius: 22, overflow: 'hidden', backgroundColor: '#F16A08', justifyContent: 'flex-start' },
  placeholder: { position: 'absolute', right: 14, bottom: 10, alignItems: 'center' }, imageNote: { color: '#fff', fontSize: 11 },
  copy: { padding: 16, backgroundColor: 'rgba(59, 25, 0, 0.76)', alignSelf: 'stretch', gap: 8 },
  title: { color: '#fff', fontSize: 18, lineHeight: 24, fontWeight: '700' },
  cta: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
