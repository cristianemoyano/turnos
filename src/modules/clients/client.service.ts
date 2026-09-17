import { Client } from "@/lib/associations";
import type { UUID } from "@/lib/base-model";

/**
 * Soft-delete a client scoped to a business (paranoid / deleted_at).
 * Appointments keep their client_id; list queries exclude soft-deleted rows.
 */
export async function softDeleteClient(businessId: UUID, clientId: string): Promise<"ok" | "not_found"> {
  const client = await Client.findOne({ where: { id: clientId, business_id: businessId } });
  if (!client) return "not_found";
  await client.destroy();
  return "ok";
}
