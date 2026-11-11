import Sidebar from "@/components/sidebar";
import { StoreProvider } from "@/lib/store";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <Sidebar>{children}</Sidebar>
    </StoreProvider>
  );
}
