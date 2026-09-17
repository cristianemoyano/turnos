"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { fetchJson, getApiErrorMessage } from "@/lib/fetch-json";
import type { NotificationListItem, UnreadSnapshot } from "@/modules/notifications/notifications.service";

const BASE = "/api/v1/notifications";

const SSE_FAIL_THRESHOLD = 3;
const POLL_FALLBACK_MS = 60_000;
const SSE_HEALTHY_AFTER_MS = 30_000;
const SSE_RETRY_BASE_MS = 2_000;
const SSE_RETRY_MAX_MS = 30_000;

export type NotificationsTransport = "sse" | "poll";

export type NotificationsContextValue = {
  unreadCount: number;
  latest: NotificationListItem[];
  loading: boolean;
  error: string | null;
  transport: NotificationsTransport;
  refresh: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

export const NotificationsContext = createContext<NotificationsContextValue>({
  unreadCount: 0,
  latest: [],
  loading: false,
  error: null,
  transport: "sse",
  refresh: () => {},
  markRead: async () => {},
  markAllRead: async () => {},
});

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const authenticated = status === "authenticated" && Boolean(session?.user?.businessId);

  const [unreadCount, setUnreadCount] = useState(0);
  const [latest, setLatest] = useState<NotificationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [transport, setTransport] = useState<NotificationsTransport>("sse");
  const [sseRetry, setSseRetry] = useState(0);
  const sseFailStreakRef = useRef(0);

  const refresh = useCallback(() => setRefreshToken((r) => r + 1), []);

  const applySnapshot = useCallback((snapshot: UnreadSnapshot) => {
    setUnreadCount(snapshot.unread_count);
    setLatest(snapshot.latest);
    setError(null);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const snapshot = await fetchJson<UnreadSnapshot>(`${BASE}/unread-count`);
        if (!cancelled) applySnapshot(snapshot);
      } catch (e) {
        if (!cancelled) setError(getApiErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authenticated, refreshToken, applySnapshot]);

  useEffect(() => {
    if (!authenticated) return;

    if (transport === "poll" || typeof EventSource === "undefined") {
      const id = window.setInterval(refresh, POLL_FALLBACK_MS);
      return () => window.clearInterval(id);
    }

    const es = new EventSource(`${BASE}/stream`);
    const openedAt = Date.now();
    let closedByCleanup = false;
    let retryTimer: number | undefined;

    const noteFailure = () => {
      if (closedByCleanup) return;
      if (Date.now() - openedAt >= SSE_HEALTHY_AFTER_MS) {
        sseFailStreakRef.current = 0;
      } else {
        sseFailStreakRef.current += 1;
      }
      if (sseFailStreakRef.current >= SSE_FAIL_THRESHOLD) {
        setTransport("poll");
        return;
      }
      const delay = Math.min(SSE_RETRY_BASE_MS * 2 ** sseFailStreakRef.current, SSE_RETRY_MAX_MS);
      retryTimer = window.setTimeout(() => setSseRetry((r) => r + 1), delay);
    };

    es.addEventListener("unread", (ev) => {
      if (closedByCleanup) return;
      try {
        const snapshot = JSON.parse((ev as MessageEvent).data) as UnreadSnapshot;
        applySnapshot(snapshot);
        setLoading(false);
      } catch {
        noteFailure();
      }
    });

    es.onerror = () => {
      if (closedByCleanup) return;
      es.close();
      noteFailure();
    };

    return () => {
      closedByCleanup = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      es.close();
    };
  }, [authenticated, transport, sseRetry, refresh, applySnapshot]);

  const markRead = useCallback(
    async (id: string) => {
      await fetchJson(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify({ read: true }) });
      refresh();
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    await fetchJson(`${BASE}/read-all`, { method: "POST" });
    refresh();
  }, [refresh]);

  return (
    <NotificationsContext.Provider
      value={{ unreadCount, latest, loading, error, transport, refresh, markRead, markAllRead }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  return useContext(NotificationsContext);
}
