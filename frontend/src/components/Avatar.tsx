import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { serviceColors as c } from './ServiceUI';

export function Avatar({ name, uri, size = 44 }: { name: string; uri?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (uri && !failed) return <Image source={{ uri }} accessibilityLabel={`${name}'s profile image`} style={style} onError={() => setFailed(true)} />;
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase() || '?';
  return <View style={[style, { backgroundColor: c.pale, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: c.green, fontWeight: '700', fontSize: size * 0.34 }}>{initials}</Text></View>;
}
