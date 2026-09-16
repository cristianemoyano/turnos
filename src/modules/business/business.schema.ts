import { z } from "zod";

export const signupSchema = z.object({
  businessName: z.string().trim().min(2).max(200),
  ownerName: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(100),
});

export type SignupInput = z.infer<typeof signupSchema>;
