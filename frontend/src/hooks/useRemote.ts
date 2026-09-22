import { useCallback, useEffect, useRef, useState } from 'react';
import { useForegroundRefresh } from './useForegroundRefresh';

export function useRemote<T>(fetchValue: () => Promise<T>, initial: T) {
  const [value, setValue] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true); setError('');
    try { const result = await fetchValue(); if (current === sequence.current) setValue(result); }
    catch (failure) { if (current === sequence.current) setError(failure instanceof Error ? failure.message : 'Unable to load data. Please retry.'); }
    finally { if (current === sequence.current) setLoading(false); }
  }, [fetchValue]);
  useEffect(() => { void refresh(); return () => { ++sequence.current; }; }, [refresh]);
  useForegroundRefresh(() => { void refresh(); });
  return { value, loading, error, refresh };
}
