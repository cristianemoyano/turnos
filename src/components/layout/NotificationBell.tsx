"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useNotifications } from "./NotificationsContext";

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { unreadCount, latest, loading, error, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  async function handleActivate(id: string, url: string | null) {
    setOpen(false);
    try {
      await markRead(id);
    } catch {
      /* ignore — navigation still useful */
    }
    if (url) router.push(url);
  }

  return (
    <div className={cn("relative", className)} ref={panelRef}>
      <button
        type="button"
        data-testid="notification-bell"
        aria-label={unreadCount > 0 ? `Notificaciones (${unreadCount} sin leer)` : "Notificaciones"}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center text-text"
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-1 w-[min(100vw-2rem,340px)] overflow-hidden border-2 border-divider bg-bg shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b-2 border-divider px-3 py-2.5">
            <span className="font-heading text-sm font-extrabold">Notificaciones</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-[11px] font-bold text-accent"
              >
                Marcar leídas
              </button>
            ) : null}
          </div>
          <div className="max-h-[min(50vh,360px)] overflow-y-auto">
            {error ? (
              <p className="px-3 py-6 text-center text-xs text-red-600">{error}</p>
            ) : loading && latest.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-text/60">Cargando…</p>
            ) : latest.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-text/60">Sin notificaciones nuevas</p>
            ) : (
              latest.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleActivate(item.id, item.url)}
                  className="flex w-full flex-col gap-0.5 border-b border-divider px-3 py-2.5 text-left hover:bg-black/5"
                >
                  <span className="text-[13px] font-bold">{item.title}</span>
                  <span className="text-[12px] text-text/70">{item.body}</span>
                  <span className="text-[10px] text-text/50">{relativeTime(item.created_at)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
