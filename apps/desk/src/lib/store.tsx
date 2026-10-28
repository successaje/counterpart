import type { EvidenceType } from '@counterpart/protocol';
import { useToast } from '@counterpart/ui';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { ApiError, api, readTokenFromLocation, subscribe } from './api.js';
import { type Action, type DeskState, initialState, reduce } from './state.js';

interface DeskApi {
  state: DeskState;
  refresh(): Promise<void>;
  decide(
    recordId: string,
    decision: 'allowed-once' | 'allowed-for-case' | 'declined',
    note?: string,
  ): Promise<void>;
  revokeTrust(caseId: string, type: EvidenceType): Promise<void>;
  dispatch(action: Action): void;
}

const DeskContext = createContext<DeskApi | null>(null);

export function useDesk(): DeskApi {
  const ctx = useContext(DeskContext);
  if (!ctx) throw new Error('useDesk must be used inside <DeskProvider>');
  return ctx;
}

export function DeskProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, initialState);
  const toast = useToast();
  const unsubscribe = useRef<(() => void) | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [info, cases, records] = await Promise.all([api.info(), api.cases(), api.records()]);
      dispatch({ type: 'hydrate', info, cases, records });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        dispatch({ type: 'connection', connection: 'unauthorized' });
        return;
      }
      dispatch({ type: 'connection', connection: 'offline' });
    }
  }, []);

  useEffect(() => {
    readTokenFromLocation();
    void refresh();
  }, [refresh]);

  // Live updates. Reconnect only when authorisation changes; refetch after
  // the stream comes back so nothing missed while it was down is lost.
  const authorized = state.connection !== 'unauthorized';
  const loadedRef = useRef(state.loaded);
  useEffect(() => {
    loadedRef.current = state.loaded;
  }, [state.loaded]);
  useEffect(() => {
    if (!authorized) return;
    let opens = 0;
    const off = subscribe(
      (event) => dispatch({ type: 'event', event }),
      (live) => {
        dispatch({ type: 'connection', connection: live ? 'live' : 'offline' });
        if (live && opens++ > 0 && loadedRef.current) void refresh();
      },
    );
    unsubscribe.current = off;
    return () => {
      off();
      unsubscribe.current = null;
    };
  }, [authorized, refresh]);

  const decide = useCallback<DeskApi['decide']>(
    async (recordId, decision, note) => {
      dispatch({ type: 'deciding', recordId, on: true });
      try {
        // The server returns when collection finishes; SSE already moved the card along.
        await api.decide(recordId, decision, note);
      } catch (err) {
        dispatch({ type: 'deciding', recordId, on: false });
        const message = err instanceof Error ? err.message : String(err);
        toast.push({ title: 'That decision did not go through', body: message, tone: 'danger' });
        void refresh();
      }
    },
    [refresh, toast],
  );

  const revokeTrust = useCallback<DeskApi['revokeTrust']>(
    async (caseId, type) => {
      try {
        const c = await api.revokeTrust(caseId, type);
        dispatch({ type: 'event', event: { type: 'case.updated', case: c } });
        toast.push({
          title: 'Trust revoked',
          body: `${type} requests on this case will ask you again.`,
          tone: 'neutral',
        });
      } catch (err) {
        toast.push({
          title: 'Could not revoke',
          body: err instanceof Error ? err.message : String(err),
          tone: 'danger',
        });
      }
    },
    [toast],
  );

  const value = useMemo<DeskApi>(
    () => ({ state, refresh, decide, revokeTrust, dispatch }),
    [state, refresh, decide, revokeTrust],
  );
  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>;
}
