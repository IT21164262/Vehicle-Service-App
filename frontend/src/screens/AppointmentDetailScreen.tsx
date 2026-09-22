import { useCallback } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appointment, getAppointment } from '../services/appointmentApi';
import { Action, Feedback, PageHeader, ui } from '../components/ServiceUI';
import { useRemote } from '../hooks/useRemote';

export function AppointmentDetailScreen({ id, onBack, onLogout, onService }: { id: string; onBack: () => void; onLogout: () => void; onService: (id: string) => void }) {
  const data = useRemote<Appointment | null>(useCallback(() => getAppointment(id), [id]), null);
  const item = data.value;
  return <SafeAreaView style={ui.safe}><View style={ui.screen}><PageHeader title="Appointment details" onBack={onBack} /><ScrollView contentContainerStyle={ui.content} refreshControl={<RefreshControl refreshing={data.loading} onRefresh={data.refresh} />}>
    {data.loading ? <Feedback title="Loading appointment" busy /> : data.error ? <Feedback title="Appointment unavailable" message={data.error} onRetry={data.refresh} /> : item ? <View style={ui.card}>
      <Text style={ui.heading}>{item.serviceName}</Text><Text style={ui.body}>Vehicle: {item.vehicleNumber}</Text><Text style={ui.body}>Date: {new Date(item.appointmentDate).toLocaleDateString()}</Text><Text style={ui.body}>Status: {item.status}</Text><Action title="View service" onPress={() => onService(item.serviceId)} />
    </View> : <Feedback title="Appointment unavailable" message="It may have been removed. Return to notifications or your appointments." />}
  </ScrollView></View></SafeAreaView>;
}
