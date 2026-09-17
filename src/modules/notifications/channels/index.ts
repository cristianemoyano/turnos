import "server-only";
import type { NotificationChannelAdapter } from "./types";
import { InAppChannelAdapter } from "./in-app.channel";
import { PushChannelAdapter } from "./push.channel";

const inAppChannel = new InAppChannelAdapter();
const pushChannel = new PushChannelAdapter();

const CHANNELS: Record<string, NotificationChannelAdapter> = {
  in_app: inAppChannel,
  push: pushChannel,
};

export function getChannelAdapter(kind: string): NotificationChannelAdapter | null {
  return CHANNELS[kind] ?? null;
}

export { InAppChannelAdapter, PushChannelAdapter };
