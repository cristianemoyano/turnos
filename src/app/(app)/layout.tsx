import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Business } from "@/lib/associations";
import { BottomNav } from "@/components/layout/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await Business.findByPk(session.user.businessId, {
    attributes: ["onboarding_completed_at"],
  });
  if (!business?.onboarding_completed_at) redirect("/onboarding");

  return (
    <div className="mx-auto flex h-screen w-full max-w-[480px] flex-col bg-bg">
      <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
      <BottomNav />
    </div>
  );
}
