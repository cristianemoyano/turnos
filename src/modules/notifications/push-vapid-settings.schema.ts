import { z } from "zod";

export const DEFAULT_PUBLIC_PUSH_VAPID_SETTINGS = {
  enabled: false,
  public_key: "",
  has_private_key: false,
  contact_email: "",
} as const;

export type PublicPushVapidSettings = {
  enabled: boolean;
  public_key: string;
  has_private_key: boolean;
  contact_email: string;
};

export const pushVapidSettingsUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  public_key: z.string().max(255).optional(),
  private_key: z.string().max(255).optional(),
  contact_email: z.string().email().max(320).or(z.literal("")).optional(),
});
export type PushVapidSettingsUpdateInput = z.infer<typeof pushVapidSettingsUpdateSchema>;
