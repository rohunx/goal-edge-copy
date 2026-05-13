import { Link, useLocation } from "wouter";
import { clearAuthToken, useCurrentUser, useGetDashboardSummary } from "@/api-client";
import { BrandMark } from "@/components/brand";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Store, Wrench, Trophy, Database, LogOut, Activity } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Marketplace", href: "/marketplace", icon: Store },
  { title: "Model Builder", href: "/builder", icon: Wrench },
  { title: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { title: "My Models", href: "/my-models", icon: Database },
  { title: "Active Predictions", href: "/active-predictions", icon: Activity },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useCurrentUser({ query: { enabled: true } });
  const handleLogout = () => { clearAuthToken(); window.location.href = "/auth"; };
  const { data: summary } = useGetDashboardSummary();

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background w-full">
        <Sidebar className="border-r border-sidebar-border bg-sidebar">
          <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
            <Link href="/" className="block w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
              <BrandMark imageClassName="max-h-20" />
            </Link>
            {summary && (
              <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-sidebar-accent p-2 rounded border border-sidebar-border">
                  <div className="text-sidebar-foreground/65 mb-1 uppercase text-[10px] font-semibold tracking-wider">Models</div>
                  <div className="font-mono text-sidebar-foreground font-semibold">{summary.totalModels}</div>
                </div>
                <div className="bg-sidebar-accent p-2 rounded border border-sidebar-border">
                  <div className="text-sidebar-foreground/65 mb-1 uppercase text-[10px] font-semibold tracking-wider">Avg Acc</div>
                  <div className="font-mono text-sidebar-primary font-semibold">{summary.averageAccuracy?.toFixed(1) || 0}%</div>
                </div>
              </div>
            )}
          </SidebarHeader>
          <SidebarContent className="px-3 py-4">
            <SidebarMenu className="gap-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.href}
                    tooltip={item.title}
                    className="h-10 w-full justify-start rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:font-bold"
                  >
                    <Link href={item.href} className="flex items-center gap-3 w-full px-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border p-3">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-md bg-sidebar-accent border border-sidebar-border p-2">
                  <Avatar className="h-8 w-8 rounded bg-sidebar-primary/15 border border-sidebar-primary/30">
                    <AvatarImage src={user.avatarUrl || ""} />
                    <AvatarFallback className="rounded bg-transparent text-sidebar-primary font-mono text-xs">{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-semibold text-sidebar-foreground truncate">{user.username}</span>
                    <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/55">Signed in</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent text-sm font-bold text-sidebar-foreground hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-muted animate-pulse" />
                <div className="space-y-1">
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-2 w-16 bg-muted animate-pulse rounded" />
                </div>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-14 border-b border-border bg-card flex items-center px-4 shrink-0 lg:hidden">
            <SidebarTrigger />
            <div className="ml-4 flex items-center gap-2">
              <BrandMark imageClassName="max-h-10" />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}