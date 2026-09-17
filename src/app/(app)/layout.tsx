import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Business } from "@/lib/associations";
import { BottomNav } from "@/components/layout/BottomNav";
import { AppShellClient } from "@/components/layout/AppShellClient";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await Business.findByPk(session.user.businessId, {
    attributes: ["onboarding_completed_at"],
  });
  if (!business?.onboarding_completed_at) redirect("/onboarding");

  return (
    <AppShellClient>
      <div className="mx-auto flex h-dvh max-h-dvh w-full max-w-[480px] flex-col overflow-hidden overscroll-none bg-bg">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        <BottomNav />
      </div>
    </AppShellClient>
  );
}
