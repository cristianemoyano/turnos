import bcrypt from "bcryptjs";
import sequelize from "@/lib/db";
import { slugify } from "@/lib/slug";
import { Business, User, BusinessHours, Service } from "@/lib/associations";
import type { SignupData } from "./business.schema";

const DEFAULT_SHIFTS = [
  { from: "09:00", to: "13:00" },
  { from: "15:00", to: "19:00" },
];

const DEFAULT_HOURS: { day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"; open: boolean; shifts: typeof DEFAULT_SHIFTS }[] = [
  { day: "mon", open: true, shifts: DEFAULT_SHIFTS },
  { day: "tue", open: true, shifts: DEFAULT_SHIFTS },
  { day: "wed", open: true, shifts: DEFAULT_SHIFTS },
  { day: "thu", open: true, shifts: DEFAULT_SHIFTS },
  { day: "fri", open: true, shifts: DEFAULT_SHIFTS },
  { day: "sat", open: true, shifts: [{ from: "09:00", to: "13:00" }] },
  { day: "sun", open: false, shifts: [] },
];

const DEFAULT_SERVICES = [
  { name: "Corte de pelo", duration_minutes: 30, price: 15000 },
  { name: "Corte + barba", duration_minutes: 45, price: 20000 },
];

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "negocio";
  let candidate = root;
  let n = 1;
  while (await Business.findOne({ where: { slug: candidate } })) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}

export class EmailInUseError extends Error {
  constructor() {
    super("EMAIL_IN_USE");
  }
}

export async function signupBusiness(input: SignupData) {
  const existing = await User.findOne({ where: { email: input.email.toLowerCase() } });
  if (existing) throw new EmailInUseError();

  const slug = await uniqueSlug(input.businessName);
  const passwordHash = await bcrypt.hash(input.password, 12);

  return sequelize.transaction(async (t) => {
    const business = await Business.create(
      {
        name: input.businessName,
        phone: null,
        address: null,
        slug,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      { transaction: t },
    );

    const user = await User.create(
      {
        business_id: business.id,
        email: input.email.toLowerCase(),
        password_hash: passwordHash,
        name: input.ownerName,
      },
      { transaction: t },
    );

    await BusinessHours.bulkCreate(
      DEFAULT_HOURS.map((h) => ({
        business_id: business.id,
        day_of_week: h.day,
        is_open: h.open,
        shifts: h.shifts,
      })),
      { transaction: t },
    );

    await Service.bulkCreate(
      DEFAULT_SERVICES.map((s) => ({
        business_id: business.id,
        name: s.name,
        duration_minutes: s.duration_minutes,
        price: String(s.price),
      })),
      { transaction: t },
    );

    return { business, user };
  });
}

export async function validateCredentials(email: string, password: string) {
  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  const business = await Business.findByPk(user.business_id);
  if (!business) return null;
  return { user, business };
}
