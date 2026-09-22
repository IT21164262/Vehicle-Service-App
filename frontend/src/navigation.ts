import type { AuthUser } from './services/authApi';

import type { Appointment } from './services/appointmentApi';
export type ProtectedRoute = { name: 'home' } | { name: 'detail'; id: string } | { name: 'add' } | { name: 'promotions' } | { name: 'edit'; id: string } | { name: 'appointments' } | { name: 'book'; serviceId: string } | { name: 'editAppointment'; appointment: Appointment } | { name: 'profile' } | { name: 'notifications' } | { name: 'appointmentDetail'; id: string };
export function allowedRoute(user: AuthUser | null, route: ProtectedRoute): ProtectedRoute | null {
  if (!user) return null;
  if (!user.isAdmin && (route.name === 'add' || route.name === 'edit' || route.name === 'promotions')) return { name: 'home' };
  return route;
}
