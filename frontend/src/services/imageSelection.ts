import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type SelectedImage = { uri: string; name: string; type: string; file?: Blob };
export async function selectImage(square = false): Promise<SelectedImage | null> {
  if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Allow photo access to choose an image. You can change this in your device settings.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, ...(square ? { aspect: [1, 1] as [number, number] } : {}), quality: 0.85 });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const file = Platform.OS === 'web' ? asset.file || await (await fetch(asset.uri)).blob() : undefined;
  const type = file?.type || asset.mimeType || 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new Error('Choose a JPEG, PNG or WebP image.');
  if ((file?.size || asset.fileSize || 0) > 5 * 1024 * 1024) throw new Error('Image must be 5 MB or smaller.');
  return { uri: asset.uri, name: asset.fileName || `image.${type === 'image/jpeg' ? 'jpg' : type.split('/')[1]}`, type, file };
}
