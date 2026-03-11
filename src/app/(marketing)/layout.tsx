import { AppNav } from "@/components/layout/app-nav";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppNav />
      <main className="pt-16">{children}</main>
    </>
  );
}
