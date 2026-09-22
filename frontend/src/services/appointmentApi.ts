import { authenticatedRequest } from './authApi';

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
export type Appointment = { id: string; userId: string; serviceId: string; serviceName: string; vehicleNumber: string; appointmentDate: string; status: AppointmentStatus };
export type AppointmentInput = { userId: string; serviceId: string; vehicleNumber: string; appointmentDate: string };

export function listAppointments() {
  return authenticatedRequest<{ appointments: Appointment[] }>('/appointments').then(result => result.appointments);
}
export function getAppointment(id: string) {
  return authenticatedRequest<{ appointment: Appointment }>(`/appointments/${encodeURIComponent(id)}`).then(result => result.appointment);
}
export function createAppointment(input: AppointmentInput) {
  return authenticatedRequest<{ appointment: Appointment }>('/appointments', 'POST', input).then(result => result.appointment);
}
export function updateAppointment(id: string, input: Partial<AppointmentInput>) {
  return authenticatedRequest<{ appointment: Appointment }>(`/appointments/${encodeURIComponent(id)}`, 'PATCH', input).then(result => result.appointment);
}
export function deleteAppointment(id: string) {
  return authenticatedRequest<void>(`/appointments/${encodeURIComponent(id)}`, 'DELETE');
}
export function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  return authenticatedRequest<{ appointment: Appointment }>(`/appointments/${encodeURIComponent(id)}/status`, 'PATCH', { status }).then(result => result.appointment);
}
