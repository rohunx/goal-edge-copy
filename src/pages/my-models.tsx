import { useListModels, useListPredictions } from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { Database, Plus, Target, Activity, TrendingUp, CheckCircle, XCircle, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ALGO_COLORS: Record<string, string> = {
  bayesian: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  linear: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  poisson: "text-violet-400 border-violet-400/30 bg-violet-400/10",
  elo: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  neural: "text-pink-400 border-pink-400/30 bg-pink-400/10",
  random_forest: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  ensemble: "text-orange-400 border-orange-400/30 bg-orange-400/10",
};

function ModelCard({ model }: { model: any }) {
  const accuracy = model.accuracyRate ?? 0;
  const accColor = accuracy >= 70 ? "text-primary" : accuracy >= 55 ? "text-amber-400" : "text-muted-foreground";
  const algoColor = ALGO_COLORS[model.algorithmType] ?? "text-muted-foreground border-border bg-muted/20";

  return (
    <Card className="border-border hover:border-primary/30 transition-all hover:shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wide ${algoColor}`}>
            {model.algorithmType?.replace("_", " ")}
          </Badge>
          <div className="flex gap-1.5">
            {model.isForSale && (
              <Badge className="bg-primary/20 text-primary border border-primary/30 text-[10px] uppercase tracking-wide">
                For Sale
              </Badge>
            )}
            {!model.isPublic && (
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
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Accuracy</div>
            <div className={`font-mono font-black text-lg ${accColor}`}>{accuracy.toFixed(1)}%</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Correct</div>
            <div className="font-mono font-bold text-base">{model.correctPredictions ?? 0}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total</div>
            <div className="font-mono font-bold text-base text-muted-foreground">{model.totalPredictions ?? 0}</div>
          </div>
        </div>

        {/* Accuracy bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
            <span>Win rate</span>
            <span>{accuracy.toFixed(1)}%</span>
          </div>
          <Progress value={accuracy} className="h-1.5" />
        </div>
      </CardContent>

      <CardFooter className="border-t border-border pt-3 gap-2">
        <Link href={`/model/${model.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full uppercase text-xs font-bold tracking-wider">
            Manage
          </Button>
        </Link>
        <Link href={`/`} className="flex-1">
          <Button size="sm" className="w-full uppercase text-xs font-bold tracking-wider">
            Run Pick
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function MyModels() {
  const { data: models, isLoading: loadingModels } = useListModels({ userId: 1 });
  const { data: recentPredictions, isLoading: loadingPredictions } = useListPredictions({ userId: 1 });

  const totalPreds = models?.reduce((s, m) => s + (m.totalPredictions ?? 0), 0) ?? 0;
  const totalCorrect = models?.reduce((s, m) => s + (m.correctPredictions ?? 0), 0) ?? 0;
  const overallAcc = totalPreds > 0 ? (totalCorrect / totalPreds) * 100 : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">My Models</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage and track your prediction engines.</p>
        </div>
        <Link href="/builder">
          <Button className="uppercase font-bold tracking-wider text-xs gap-2">
            <Plus className="w-4 h-4" /> New Model
          </Button>
        </Link>
      </div>

      {/* Quick stats */}
      {!loadingModels && models && models.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-3.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1">
              <Database className="w-3 h-3" /> Models
            </div>
            <div className="font-mono font-black text-2xl text-foreground">{models.length}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> Total Picks
            </div>
            <div className="font-mono font-black text-2xl text-foreground">{totalPreds}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Win Rate
            </div>
            <div className={`font-mono font-black text-2xl ${overallAcc >= 60 ? "text-primary" : "text-muted-foreground"}`}>
              {overallAcc.toFixed(1)}%
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3" /> For Sale
            </div>
            <div className="font-mono font-black text-2xl text-foreground">{models.filter(m => m.isForSale).length}</div>
          </div>
        </div>
      )}

      <Tabs defaultValue="models" className="w-full">
        <TabsList className="mb-5">
          <TabsTrigger value="models" className="uppercase text-xs tracking-wider font-bold">
            Active Models {models?.length ? `(${models.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="predictions" className="uppercase text-xs tracking-wider font-bold">
            Prediction History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="mt-0">
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
              <p className="text-muted-foreground text-sm mt-1 max-w-xs">Build your first prediction engine and start competing on the leaderboard.</p>
              <Link href="/builder" className="mt-5">
                <Button>Build First Model</Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="predictions" className="mt-0">
          <Card>
            <CardContent className="p-0">
              {loadingPredictions ? (
                <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : recentPredictions && recentPredictions.length > 0 ? (
                <div className="divide-y divide-border">
                  {recentPredictions.map(pred => {
                    const outcomeLabel = pred.predictedOutcome.replace("_", " ").toUpperCase();
                    return (
                      <div key={pred.id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                            <Activity className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">{pred.homeTeam} vs {pred.awayTeam}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{pred.modelName}</span>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="font-bold text-foreground">{outcomeLabel}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div className="font-mono text-sm font-bold">{pred.confidence.toFixed(0)}%</div>
                          <div className="mt-1">
                            {pred.isCorrect === true && (
                              <div className="flex items-center gap-1 text-primary text-xs font-bold">
                                <CheckCircle className="w-3 h-3" /> Correct
                              </div>
                            )}
                            {pred.isCorrect === false && (
                              <div className="flex items-center gap-1 text-destructive text-xs font-bold">
                                <XCircle className="w-3 h-3" /> Wrong
                              </div>
                            )}
                            {pred.isCorrect === null && (
                              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                                <Clock className="w-3 h-3" /> Pending
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm font-mono">
                  No predictions made yet. Pick a match and run your model.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
