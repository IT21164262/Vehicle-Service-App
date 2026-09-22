import type { AuthUser } from './services/authApi';

export type ProtectedRoute = { name: 'home' } | { name: 'detail'; id: string } | { name: 'add' } | { name: 'edit'; id: string };
export function allowedRoute(user: AuthUser | null, route: ProtectedRoute): ProtectedRoute | null {
  if (!user) return null;
  if (!user.isAdmin && (route.name === 'add' || route.name === 'edit')) return { name: 'home' };
  return route;
}
