import "server-only";
import webpush from "web-push";
import PlatformSetting from "./platform-setting.model";
import { decryptSecret, encryptSecret, isEncryptedSecret } from "@/lib/crypto";
import {
  type PublicPushVapidSettings,
  type PushVapidSettingsUpdateInput,
} from "./push-vapid-settings.schema";

export class PushVapidSettingsValidationError extends Error {
  readonly code = "VALIDATION_ERROR" as const;
  constructor(message: string) {
    super(message);
    this.name = "PushVapidSettingsValidationError";
  }
}

async function getRow(): Promise<PlatformSetting> {
  const existing = await PlatformSetting.findOne({ where: { singleton: true } });
  if (existing) return existing;
  return PlatformSetting.create({ singleton: true });
}

function decryptField(encrypted: string): string {
  if (!encrypted) return "";
  return decryptSecret(encrypted) ?? "";
}

function encryptField(plaintext: string, existingEncrypted: string): string {
  if (!plaintext) return existingEncrypted;
  return isEncryptedSecret(plaintext) ? plaintext : encryptSecret(plaintext);
}

function toPublic(row: PlatformSetting): PublicPushVapidSettings {
  return {
    enabled: row.push_vapid_enabled ?? false,
    public_key: row.push_vapid_public_key ?? "",
    has_private_key: (row.push_vapid_private_key_encrypted ?? "").length > 0,
    contact_email: row.push_vapid_contact_email ?? "",
  };
}

/** Prefer DB; fall back to env for local bootstrap without UI. */
function envBootstrap(): {
  enabled: boolean;
  publicKey: string;
  privateKey: string;
  contactEmail: string;
} | null {
  const publicKey = (process.env.PUSH_VAPID_PUBLIC_KEY ?? "").trim();
  const privateKey = (process.env.PUSH_VAPID_PRIVATE_KEY ?? "").trim();
  const contactEmail = (process.env.PUSH_VAPID_CONTACT_EMAIL ?? "").trim();
  const enabledFlag = process.env.PUSH_VAPID_ENABLED;
  if (!publicKey || !privateKey || !contactEmail) return null;
  const enabled = enabledFlag === undefined ? true : enabledFlag === "true" || enabledFlag === "1";
  return { enabled, publicKey, privateKey, contactEmail };
}

export async function getPublicPushVapidSettings(): Promise<PublicPushVapidSettings> {
  const row = await getRow();
  const publicView = toPublic(row);
  if (publicView.enabled && publicView.public_key) return publicView;

  const env = envBootstrap();
  if (env?.enabled) {
    return {
      enabled: true,
      public_key: env.publicKey,
      has_private_key: true,
      contact_email: env.contactEmail,
    };
  }
  return publicView;
}

type VapidCredentials = { publicKey: string; privateKey: string; contactEmail: string };

const PUSH_VAPID_CREDS_TTL_MS = 30_000;
let vapidCredsCache: { value: VapidCredentials | null; expiresAt: number } | null = null;

export function clearPushVapidSettingsCache(): void {
  vapidCredsCache = null;
}

export async function isPushVapidReady(): Promise<boolean> {
  return (await getResolvedPushVapidCredentials()) !== null;
}

export async function getResolvedPushVapidCredentials(): Promise<VapidCredentials | null> {
  if (vapidCredsCache && vapidCredsCache.expiresAt >= Date.now()) {
    return vapidCredsCache.value;
  }

  const row = await getRow();
  let value: VapidCredentials | null = null;
  if (row.push_vapid_enabled) {
    const publicKey = row.push_vapid_public_key.trim();
    const privateKey = decryptField(row.push_vapid_private_key_encrypted).trim();
    const contactEmail = row.push_vapid_contact_email.trim();
    if (publicKey && privateKey && contactEmail) value = { publicKey, privateKey, contactEmail };
  }

  if (!value) {
    const env = envBootstrap();
    if (env?.enabled) {
      value = {
        publicKey: env.publicKey,
        privateKey: env.privateKey,
        contactEmail: env.contactEmail,
      };
    }
  }

  vapidCredsCache = { value, expiresAt: Date.now() + PUSH_VAPID_CREDS_TTL_MS };
  return value;
}

export async function updatePushVapidSettings(
  input: PushVapidSettingsUpdateInput,
): Promise<PublicPushVapidSettings> {
  const row = await getRow();

  const push_vapid_public_key = (input.public_key ?? row.push_vapid_public_key).trim();
  const push_vapid_private_key_encrypted = encryptField(
    (input.private_key ?? "").trim(),
    row.push_vapid_private_key_encrypted,
  );
  const push_vapid_contact_email = (input.contact_email ?? row.push_vapid_contact_email).trim();
  const enabled = input.enabled ?? row.push_vapid_enabled;

  if (enabled) {
    if (!push_vapid_public_key) {
      throw new PushVapidSettingsValidationError(
        "La clave pública VAPID es obligatoria para habilitar push",
      );
    }
    if (push_vapid_private_key_encrypted.length === 0) {
      throw new PushVapidSettingsValidationError(
        "La clave privada VAPID es obligatoria para habilitar push",
      );
    }
    if (!push_vapid_contact_email) {
      throw new PushVapidSettingsValidationError(
        "El email de contacto es obligatorio para habilitar push",
      );
    }
  }

  await row.update({
    push_vapid_enabled: enabled,
    push_vapid_public_key,
    push_vapid_private_key_encrypted,
    push_vapid_contact_email,
  });
  clearPushVapidSettingsCache();
  return toPublic(await getRow());
}

export function generateVapidKeyPair(): { publicKey: string; privateKey: string } {
  const keys = webpush.generateVAPIDKeys();
  return { publicKey: keys.publicKey, privateKey: keys.privateKey };
}
