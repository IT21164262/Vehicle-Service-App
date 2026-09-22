import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

// Screens mount on navigation in this app. Also refresh when returning from
// another app/browser tab; no background polling or sockets are introduced.
export function useForegroundRefresh(refresh: () => void) {
  const latest = useRef(refresh);
  latest.current = refresh;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') latest.current();
    });
    const focus = () => latest.current();
    if (Platform.OS === 'web') window.addEventListener('focus', focus);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web') window.removeEventListener('focus', focus);
    };
  }, []);
}
