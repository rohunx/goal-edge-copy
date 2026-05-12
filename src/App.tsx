import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout";
import { getAuthToken } from "@/api-client";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Marketplace from "@/pages/marketplace";
import Builder from "@/pages/builder";
import Leaderboard from "@/pages/leaderboard";
import MyModels from "@/pages/my-models";
import MatchDetail from "@/pages/match-detail";
import ModelDetail from "@/pages/model-detail";
import AuthPage from "@/pages/auth";

const queryClient = new QueryClient();

function ProtectedRouter() {
  const authed = Boolean(getAuthToken());
  if (!authed) return <Redirect to="/auth" />;
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/marketplace" component={Marketplace} />
        <Route path="/builder" component={Builder} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/my-models" component={MyModels} />
        <Route path="/match/:id" component={MatchDetail} />
        <Route path="/model/:id" component={ModelDetail} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route><ProtectedRouter /></Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
