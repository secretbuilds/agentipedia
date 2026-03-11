import { Suspense } from "react";
import { AppNav } from "@/components/layout/app-nav";
import { WelcomeTweetDialog } from "@/components/shared/welcome-tweet-dialog";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppNav />
      <main className="pt-16">{children}</main>
      <Suspense fallback={null}>
        <WelcomeTweetDialog />
      </Suspense>
    </>
  );
}
