import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, PageHeader, serviceColors as c, ui } from '../components/ServiceUI';
import { Avatar } from '../components/Avatar';
import { AuthUser } from '../services/authApi';
import { updatePassword, updateProfile, uploadProfileImage } from '../services/profileApi';
import { selectImage, SelectedImage } from '../services/imageSelection';

type Props = { user: AuthUser; onBack: () => void; onLogout: () => void; onUpdated: (user: AuthUser) => void };
export function ProfileScreen({ user, onBack, onLogout, onUpdated }: Props) {
  const [name, setName] = useState(user.name), [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState(''), [newPassword, setNewPassword] = useState(''), [confirmation, setConfirmation] = useState('');
  const [profileMessage, setProfileMessage] = useState(''), [passwordMessage, setPasswordMessage] = useState(''), [imageMessage, setImageMessage] = useState('');
  const [profileError, setProfileError] = useState(''), [passwordError, setPasswordError] = useState(''), [imageError, setImageError] = useState('');
  const [busy, setBusy] = useState<'profile' | 'password' | 'image' | 'picker' | null>(null);
  const [selected, setSelected] = useState<SelectedImage | null>(null), [progress, setProgress] = useState(0);
  const [passwordChanged, setPasswordChanged] = useState(false);
  async function chooseImage() {
    setImageError(''); setImageMessage(''); setBusy('picker');
    try { const image = await selectImage(true); if (image) setSelected(image); }
    catch (failure) { setImageError(failure instanceof Error ? failure.message : 'Unable to select a photo.'); }
    finally { setBusy(null); }
  }
  async function upload() {
    if (!selected || busy) return;
    setBusy('image'); setImageError(''); setImageMessage(''); setProgress(0);
    try { const updated = await uploadProfileImage(selected, setProgress); onUpdated(updated); setSelected(null); setImageMessage('Profile image updated.'); }
    catch (failure) { setImageError(failure instanceof Error ? failure.message : 'Unable to upload. Your selected photo is kept for retry.'); }
    finally { setBusy(null); }
  }
  async function saveProfile() {
    setProfileError(''); setProfileMessage('');
    if (!name.trim() || name.trim().length > 120) return setProfileError('Enter a name of 1?120 characters.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setProfileError('Enter a valid email address.');
    setBusy('profile');
    try { const updated = await updateProfile({ name: name.trim(), email: email.trim() }); onUpdated(updated); setName(updated.name); setEmail(updated.email); setProfileMessage('Profile updated successfully.'); }
    catch (failure) { setProfileError(failure instanceof Error ? failure.message : 'Unable to update your profile.'); }
    finally { setBusy(null); }
  }
  async function savePassword() {
    setPasswordError(''); setPasswordMessage('');
    if (!currentPassword || !newPassword || !confirmation) return setPasswordError('Complete all password fields.');
    const bytes = Array.from(newPassword).reduce((total, char) => total + ((char.codePointAt(0) || 0) <= 127 ? 1 : (char.codePointAt(0) || 0) <= 2047 ? 2 : (char.codePointAt(0) || 0) <= 65535 ? 3 : 4), 0);
    if (newPassword.length < 8 || bytes > 72) return setPasswordError('New password must have at least 8 characters and at most 72 bytes.');
    if (newPassword !== confirmation) return setPasswordError('New password and confirmation do not match.');
    setBusy('password');
    try { await updatePassword({ currentPassword, newPassword }); setCurrentPassword(''); setNewPassword(''); setConfirmation(''); setPasswordChanged(true); setPasswordMessage('Password changed. Log out and sign in with your new password.'); }
    catch (failure) { setPasswordError(failure instanceof Error ? failure.message : 'Unable to change your password.'); }
    finally { setBusy(null); }
  }
  const disabled = !!busy || passwordChanged;
  return <SafeAreaView style={ui.safe}><View style={ui.screen}><PageHeader title="Edit profile" onBack={onBack} disabled={!!busy} /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
    <View style={[ui.card, styles.profileCard]}><Avatar name={user.name} uri={selected?.uri || user.profileImageUrl} size={96} /><Text style={ui.heading}>{user.name}</Text><Text style={ui.body}>{user.email}</Text><Text style={styles.role}>{user.isAdmin ? 'Administrator' : 'Customer'}</Text>{!!selected && <Text style={ui.body}>Selected photo preview ? not uploaded yet</Text>}<Action title={selected ? 'Choose another photo' : 'Choose profile photo'} icon="image-outline" secondary onPress={chooseImage} disabled={disabled} />{!!selected && <><Action title={busy === 'image' ? `Uploading ${Math.round(progress * 100)}%` : 'Upload selected photo'} onPress={upload} busy={busy === 'image'} disabled={disabled} /><Action title="Cancel selection" secondary disabled={disabled} onPress={() => setSelected(null)} /></>}{!!imageError && <Text accessibilityRole="alert" style={ui.error}>{imageError}</Text>}{!!imageMessage && <Text accessibilityLiveRegion="polite" style={styles.success}>{imageMessage}</Text>}</View>
    <View style={ui.card}><Text style={styles.sectionTitle}>Profile details</Text><Text style={styles.label}>Name</Text><TextInput accessibilityLabel="Name" value={name} onChangeText={setName} style={styles.input} editable={!disabled} autoCapitalize="words" maxLength={120} /><Text style={styles.label}>Email</Text><TextInput accessibilityLabel="Email" value={email} onChangeText={setEmail} style={styles.input} editable={!disabled} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />{!!profileError && <Text accessibilityRole="alert" style={ui.error}>{profileError}</Text>}{!!profileMessage && <Text accessibilityLiveRegion="polite" style={styles.success}>{profileMessage}</Text>}<Action title="Save profile" onPress={saveProfile} busy={busy === 'profile'} disabled={disabled} /></View>
    <View style={ui.card}><Text style={styles.sectionTitle}>Change password</Text>{([{ label: 'Current password', value: currentPassword, change: setCurrentPassword }, { label: 'New password', value: newPassword, change: setNewPassword }, { label: 'Confirm new password', value: confirmation, change: setConfirmation }] as const).map(field => <View key={field.label}><Text style={styles.label}>{field.label}</Text><TextInput accessibilityLabel={field.label} value={field.value} onChangeText={field.change} style={styles.input} secureTextEntry editable={!disabled} autoCapitalize="none" autoCorrect={false} /></View>)}{!!passwordError && <Text accessibilityRole="alert" style={ui.error}>{passwordError}</Text>}{!!passwordMessage && <Text accessibilityLiveRegion="polite" style={styles.success}>{passwordMessage}</Text>}<Action title="Change password" onPress={savePassword} busy={busy === 'password'} disabled={disabled} /></View>
  </ScrollView></KeyboardAvoidingView></View></SafeAreaView>;
}
const styles = StyleSheet.create({ profileCard: { alignItems: 'center' }, role: { color: c.orange, fontWeight: '700' }, sectionTitle: { color: c.dark, fontSize: 19, fontWeight: '700' }, label: { color: c.dark, fontWeight: '600', marginBottom: 8 }, input: { minHeight: 52, backgroundColor: c.white, borderColor: c.border, borderWidth: 1, borderRadius: 16, paddingHorizontal: 15, color: c.dark }, success: { color: c.green, lineHeight: 21 } });
