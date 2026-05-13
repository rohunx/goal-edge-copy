import { useAvailableModels, useCurrentUser, useListModels } from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { Database, Plus, Target, TrendingUp, Store } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ALGO_COLORS: Record<string, string> = {
  bayesian: "text-blue-500 border-blue-500/30 bg-blue-500/10",
  linear: "text-sky-500 border-sky-500/30 bg-sky-500/10",
  poisson: "text-indigo-500 border-indigo-500/30 bg-indigo-500/10",
  elo: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  neural: "text-red-500 border-red-500/30 bg-red-500/10",
  random_forest: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  ensemble: "text-primary border-primary/30 bg-primary/10",
};

function ModelCard({ model, marketplace = false }: { model: any; marketplace?: boolean }) {
  const accuracy = model.accuracyRate ?? 0;
  const accColor = accuracy >= 70 ? "text-primary" : accuracy >= 55 ? "text-amber-500" : "text-muted-foreground";
  const algoColor = ALGO_COLORS[model.algorithmType] ?? "text-muted-foreground border-border bg-muted/20";

  return (
    <Card className="border-border hover:border-primary/30 transition-all hover:shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wide ${algoColor}`}>
            {model.algorithmType?.replace("_", " ")}
          </Badge>
          <div className="flex gap-1.5">
            {marketplace ? (
              <Badge className="bg-destructive/10 text-destructive border border-destructive/30 text-[10px] uppercase tracking-wide">
                Marketplace
              </Badge>
            ) : model.isForSale ? (
              <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px] uppercase tracking-wide">
                For Sale
              </Badge>
            ) : null}
            {!marketplace && !model.isPublic && (
              <Badge variant="secondary" className="text-[10px] uppercase">Private</Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-base font-black">{model.name}</CardTitle>
        {model.description && (
          <CardDescription className="text-xs line-clamp-1">{model.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="pb-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Accuracy</div>
            <div className={`font-mono font-black text-lg ${accColor}`}>{accuracy.toFixed(1)}%</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Verified</div>
            <div className="font-mono font-bold text-base">{model.correctPredictions ?? 0}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Eligible</div>
            <div className="font-mono font-bold text-base text-muted-foreground">{model.totalPredictions ?? 0}</div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>Verified rate</span>
            <span>{accuracy.toFixed(1)}%</span>
          </div>
          <Progress value={accuracy} className="h-1.5" />
        </div>
      </CardContent>

      <CardFooter className="border-t border-border pt-3 gap-2">
        <Link href={`/model/${model.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full uppercase text-xs font-bold tracking-wider">
            {marketplace ? "View" : "Manage"}
          </Button>
        </Link>
        <Link href="/" className="flex-1">
          <Button size="sm" className="w-full uppercase text-xs font-bold tracking-wider">
            Run Pick
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function MyModels() {
  const { data: user } = useCurrentUser();
  const { data: models, isLoading: loadingModels } = useListModels(
    user ? { userId: user.id } : undefined,
    { query: { enabled: Boolean(user) } }
  );
  const { data: availableModels, isLoading: loadingAvailable } = useAvailableModels();
  const marketplaceModels = (availableModels ?? []).filter((model) => model.isAcquired);

  const totalPreds = models?.reduce((s, m) => s + (m.totalPredictions ?? 0), 0) ?? 0;
  const totalCorrect = models?.reduce((s, m) => s + (m.correctPredictions ?? 0), 0) ?? 0;
  const overallAcc = totalPreds > 0 ? (totalCorrect / totalPreds) * 100 : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Models</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your ForecastDIY models and the marketplace models you added.</p>
        </div>
        <Link href="/builder">
          <Button className="uppercase font-bold tracking-wider text-xs gap-2">
            <Plus className="w-4 h-4" /> New Model
          </Button>
        </Link>
      </div>

      {!loadingModels && models && models.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-3.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1">
              <Database className="w-3 h-3" /> My Models
            </div>
            <div className="font-mono font-black text-2xl text-foreground">{models.length}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1">
              <Store className="w-3 h-3" /> Marketplace
            </div>
            <div className="font-mono font-black text-2xl text-foreground">{marketplaceModels.length}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> Eligible Picks
            </div>
            <div className="font-mono font-black text-2xl text-foreground">{totalPreds}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Verified Rate
            </div>
            <div className={`font-mono font-black text-2xl ${overallAcc >= 60 ? "text-primary" : "text-muted-foreground"}`}>
              {overallAcc.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="my-models" className="w-full">
        <TabsList className="mb-5">
          <TabsTrigger value="my-models" className="uppercase text-xs tracking-wider font-bold">
            My Models {models?.length ? `(${models.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="marketplace-models" className="uppercase text-xs tracking-wider font-bold">
            Marketplace Models {marketplaceModels.length ? `(${marketplaceModels.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-models" className="mt-0">
          {loadingModels ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[230px] rounded-xl" />)}
            </div>
          ) : models && models.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {models.map(model => <ModelCard key={model.id} model={model} />)}
            </div>
          ) : (
            <div className="p-16 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center bg-card/50">
              <Database className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-bold">No Models Yet</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-xs">Build your first prediction engine and start forecasting upcoming matches.</p>
              <Link href="/builder" className="mt-5">
                <Button>Build First Model</Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="marketplace-models" className="mt-0">
          {loadingAvailable ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[230px] rounded-xl" />)}
            </div>
          ) : marketplaceModels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {marketplaceModels.map(model => <ModelCard key={model.id} model={model} marketplace />)}
            </div>
          ) : (
            <div className="p-16 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center bg-card/50">
              <Store className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-bold">No Marketplace Models Added</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-xs">Add public models from Marketplace to use them on upcoming matches.</p>
              <Link href="/marketplace" className="mt-5">
                <Button>Browse Marketplace</Button>
              </Link>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}