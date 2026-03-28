import PortalSidebar from "@/components/portal/PortalSidebar";

export default function PortalAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#080810]">
      <PortalSidebar />
      <div className="ml-60 flex-1">{children}</div>
    </div>
  );
}
