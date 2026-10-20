import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import Providers from "@/components/providers";

// Dashboard routes are dynamic (user-specific content)
export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="min-h-screen bg-neutral-950">
        <Sidebar />
        <div className="md:ml-64 min-h-screen transition-all duration-200">
          <Header />
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
