import { Link, useLocation } from "wouter";
import { clearAuthToken, useCurrentUser, useGetDashboardSummary } from "@/api-client";
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
import { LayoutDashboard, Store, Wrench, Trophy, Database, Target, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Marketplace", href: "/marketplace", icon: Store },
  { title: "Model Builder", href: "/builder", icon: Wrench },
  { title: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { title: "My Models", href: "/my-models", icon: Database },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useCurrentUser({ query: { enabled: true } });
  const handleLogout = () => { clearAuthToken(); window.location.href = "/auth"; };
  const { data: summary } = useGetDashboardSummary();

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background w-full">
        <Sidebar className="border-r border-border bg-sidebar">
          <SidebarHeader className="border-b border-border px-4 py-6">
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold tracking-tight text-foreground uppercase">GOAL<span className="text-primary">EDGE</span></span>
            </div>
            {summary && (
              <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-card p-2 rounded border border-border">
                  <div className="text-muted-foreground mb-1 uppercase text-[10px] font-semibold tracking-wider">Models</div>
                  <div className="font-mono text-foreground font-semibold">{summary.totalModels}</div>
                </div>
                <div className="bg-card p-2 rounded border border-border">
                  <div className="text-muted-foreground mb-1 uppercase text-[10px] font-semibold tracking-wider">Avg Acc</div>
                  <div className="font-mono text-primary font-semibold">{summary.averageAccuracy?.toFixed(1) || 0}%</div>
                </div>
              </div>
            )}
          </SidebarHeader>
          <SidebarContent className="px-2 py-4">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href} className="flex items-center gap-3 w-full">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-border p-4">
            {user ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 rounded bg-primary/10 border border-primary/20">
                  <AvatarImage src={user.avatarUrl || ""} />
                  <AvatarFallback className="rounded bg-transparent text-primary font-mono text-xs">{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-semibold text-foreground truncate">{user.username}</span>
                  <span className="text-xs text-muted-foreground font-mono">{user.correctPredictions}/{user.totalPredictions} won</span>
                </div>
                <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground" title="Log out">
                  <LogOut className="h-4 w-4" />
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
              <Target className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold tracking-tight text-foreground uppercase">GOAL<span className="text-primary">EDGE</span></span>
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