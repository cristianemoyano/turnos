import { z } from "zod";

/** Optional http(s) URL field (empty → null). Used for maps / social links. */
export function optionalHttpUrlSchema(message: string) {
  return z
    .union([z.string(), z.null()])
    .optional()
    .superRefine((v, ctx) => {
      if (v === undefined || v === null) return;
      const trimmed = v.trim();
      if (!trimmed) return;
      if (trimmed.length > 500) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_big,
          maximum: 500,
          type: "string",
          inclusive: true,
          origin: "string",
        });
        return;
      }
      if (!/^https?:\/\//i.test(trimmed)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      }
    })
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null || !v.trim()) return null;
      return v.trim();
    });
}
