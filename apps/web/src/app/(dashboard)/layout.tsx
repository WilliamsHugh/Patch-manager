import { MasterDetailLayout } from "@/components/layout/master-detail-layout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <MasterDetailLayout>{children}</MasterDetailLayout>;
}
