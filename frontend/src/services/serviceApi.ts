import { authenticatedRequest, authenticatedUpload } from './authApi';

export type Service = {
  id: string; name: string; description: string; price: number;
  imageUrl: string; maxAppointmentsPerDay: number;
};
export type ServiceInput = Omit<Service, 'id'>;

export async function listServices(): Promise<Service[]> {
  const result = await authenticatedRequest<{ services: Service[] }>('/services');
  if (!Array.isArray(result.services)) throw new Error('The service list could not be read. Please retry.');
  return result.services;
}
export async function getService(id: string): Promise<Service> {
  const result = await authenticatedRequest<{ service: Service }>(`/services/${encodeURIComponent(id)}`);
  if (!result.service?.id) throw new Error('The service could not be read. Please retry.');
  return result.service;
}
export async function createService(input: ServiceInput) {
  return (await authenticatedRequest<{ service: Service }>('/services', 'POST', input)).service;
}
export async function updateService(id: string, input: ServiceInput) {
  return (await authenticatedRequest<{ service: Service }>(`/services/${encodeURIComponent(id)}`, 'PATCH', input)).service;
}
export function deleteService(id: string) {
  return authenticatedRequest<void>(`/services/${encodeURIComponent(id)}`, 'DELETE');
}
export function uploadServiceImage(id: string, file: { uri: string; name: string; type: string; file?: Blob }, onProgress?: (value: number) => void) {
  return authenticatedUpload<{ service: Service }>(`/services/${encodeURIComponent(id)}/image`, file, onProgress).then(result => result.service);
}
