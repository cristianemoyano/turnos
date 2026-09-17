/**
 * In-process pub/sub for live agenda SSE.
 *
 * Single Node process only (current Turnos Docker Swarm runs one app replica).
 * Multi-replica would need Redis/Postgres LISTEN — out of scope for now.
 */

export type AgendaLiveEventType =
  | "appointment.created"
  | "appointment.updated"
  | "appointment.cancelled"
  | "appointment.removed"
  | "block.changed";

export type AgendaLiveEvent = {
  type: AgendaLiveEventType;
  appointmentId?: string;
  /** YYYY-MM-DD keys (business timezone) affected — clients may filter refresh. */
  dateKeys?: string[];
  at: string;
};

type Listener = (event: AgendaLiveEvent) => void;

const listenersByBusiness = new Map<string, Set<Listener>>();

export function subscribeAgendaEvents(businessId: string, listener: Listener): () => void {
  let set = listenersByBusiness.get(businessId);
  if (!set) {
    set = new Set();
    listenersByBusiness.set(businessId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) listenersByBusiness.delete(businessId);
  };
}

export function publishAgendaEvent(businessId: string, event: Omit<AgendaLiveEvent, "at">): void {
  const full: AgendaLiveEvent = { ...event, at: new Date().toISOString() };
  const set = listenersByBusiness.get(businessId);
  if (!set || set.size === 0) return;
  for (const listener of set) {
    try {
      listener(full);
    } catch {
      // Ignore listener errors so one bad client cannot break fan-out.
    }
  }
}

/** Test helper. */
export function clearAgendaEventListeners(): void {
  listenersByBusiness.clear();
}

/** Test helper. */
export function agendaListenerCount(businessId: string): number {
  return listenersByBusiness.get(businessId)?.size ?? 0;
}
