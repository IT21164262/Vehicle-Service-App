import { authenticatedRequest, AuthUser } from './authApi';

export function updateProfile(input: { name: string; email: string }) {
  return authenticatedRequest<{ user: AuthUser }>('/auth/profile', 'PATCH', input).then(result => result.user);
}

export function updatePassword(input: { currentPassword: string; newPassword: string }) {
  return authenticatedRequest<{ message: string }>('/auth/password', 'PATCH', input);
}
export function uploadProfileImage(file: { uri: string; name: string; type: string; file?: Blob }, onProgress?: (value: number) => void) {
  return import('./authApi').then(({ authenticatedUpload }) => authenticatedUpload<{ user: AuthUser }>('/auth/profile/image', file, onProgress).then(result => result.user));
}
