import { useParams, Link } from "wouter";
import { useGetModel, useGetModelPerformance, useUpdateModel } from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Brain, Target, Activity, BarChart2, Shield, Zap, Dna, Database, TrendingUp, Thermometer, Edit3, Check, X, Tag } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetModelQueryKey } from "@/api-client";
import { useState } from "react";

const FACTOR_ICONS: Record<string, React.ElementType> = {
  weightTeamForm: Activity,
  weightHomeAdvantage: Shield,
  weightInjuries: Zap,
  weightHeadToHead: Dna,
  weightPlayerStrength: Target,
  weightMarketOdds: Database,
  weightRecentForm: TrendingUp,
  weightWeather: Thermometer,
};

const FACTOR_LABELS: Record<string, string> = {
  weightTeamForm: "Team Form",
  weightHomeAdvantage: "Home Advantage",
  weightInjuries: "Injuries",
  weightHeadToHead: "Head-to-Head",
  weightPlayerStrength: "Player Strength",
  weightMarketOdds: "Market Odds",
  weightRecentForm: "Recent Form",
  weightWeather: "Weather",
};

const ALGO_COLORS: Record<string, string> = {
  bayesian: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  linear: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  poisson: "text-violet-400 border-violet-400/30 bg-violet-400/10",
  elo: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  neural: "text-pink-400 border-pink-400/30 bg-pink-400/10",
  random_forest: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  ensemble: "text-orange-400 border-orange-400/30 bg-orange-400/10",
};

const factorKeys = Object.keys(FACTOR_LABELS) as Array<keyof typeof FACTOR_LABELS>;

export default function ModelDetail() {
  const { id } = useParams();
  const modelId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: model, isLoading: loadingModel } = useGetModel(modelId, {
    query: { enabled: !!modelId, queryKey: getGetModelQueryKey(modelId) },
  });
  const { data: performance, isLoading: loadingPerformance } = useGetModelPerformance(modelId, {
    query: { enabled: !!modelId, queryKey: ["modelPerformance", modelId] },
  });
  const updateModelMutation = useUpdateModel();

  const isOwner = model?.userId === 1;

  const [editingWeights, setEditingWeights] = useState(false);
  const [pendingWeights, setPendingWeights] = useState<Record<string, number>>({});

  const startEditing = () => {
    if (!model) return;
    const current: Record<string, number> = {};
    factorKeys.forEach(k => { current[k] = (model[k as keyof typeof model] as number) ?? 50; });
    setPendingWeights(current);
    setEditingWeights(true);
  };

  const saveWeights = () => {
    updateModelMutation.mutate({ id: modelId, data: pendingWeights }, {
      onSuccess: () => {
        toast({ title: "Weights updated", description: "Model recalibrated successfully." });
        queryClient.invalidateQueries({ queryKey: getGetModelQueryKey(modelId) });
        setEditingWeights(false);
      },
      onError: () => toast({ title: "Error", description: "Failed to update weights.", variant: "destructive" }),
    });
  };

  const handleTogglePublic = (checked: boolean) => {
    updateModelMutation.mutate({ id: modelId, data: { isPublic: checked } }, {
      onSuccess: () => {
        toast({ title: "Updated", description: `Model is now ${checked ? "public" : "private"}.` });
        queryClient.invalidateQueries({ queryKey: getGetModelQueryKey(modelId) });
      },
      onError: () => toast({ title: "Error", description: "Failed to update.", variant: "destructive" }),
    });
  };

  if (loadingModel) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 col-span-2 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!model) return <div className="text-center py-12 font-mono text-muted-foreground">Model not found.</div>;

  const algoColor = ALGO_COLORS[model.algorithmType] ?? "text-muted-foreground";
  const accColor = (model.accuracyRate ?? 0) >= 70 ? "text-primary" : (model.accuracyRate ?? 0) >= 55 ? "text-amber-400" : "text-muted-foreground";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-5">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-black tracking-tight uppercase">{model.name}</h1>
            <Badge variant="outline" className={`text-[10px] font-bold uppercase ${algoColor}`}>
              {model.algorithmType?.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">{model.description || "No description provided."}</p>
          <div className="text-xs text-muted-foreground font-mono flex items-center gap-2 flex-wrap">
            <span>Creator: <span className="font-bold text-foreground">{model.username || "Unknown"}</span></span>
            <span className="text-muted-foreground/40">·</span>
            <span>Created {new Date(model.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {isOwner ? (
            <>
              <div className="flex items-center gap-2 bg-card border border-border p-2 rounded-lg">
                <Switch id="public-mode" checked={model.isPublic} onCheckedChange={handleTogglePublic} disabled={updateModelMutation.isPending} />
                <Label htmlFor="public-mode" className="text-xs uppercase tracking-wider font-bold cursor-pointer">Public</Label>
              </div>
              {!editingWeights && (
                <Button variant="outline" size="sm" className="gap-1.5 font-bold uppercase text-xs" onClick={startEditing}>
                  <Edit3 className="w-3.5 h-3.5" /> Edit Weights
                </Button>
              )}
            </>
          ) : (
            model.isForSale && (
              <Button className="uppercase font-bold tracking-wider gap-2">
                <Tag className="w-4 h-4" /> Buy — ${model.price}
              </Button>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Performance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="uppercase tracking-wider text-xs flex items-center gap-2 text-muted-foreground">
                <BarChart2 className="w-4 h-4" /> Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPerformance ? (
                <Skeleton className="h-32 w-full" />
              ) : performance ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted rounded-xl p-4 border border-border">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Accuracy</div>
                    <div className={`text-3xl font-black font-mono ${accColor}`}>{(performance.accuracyRate ?? 0).toFixed(1)}%</div>
                  </div>
                  <div className="bg-muted rounded-xl p-4 border border-border">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Record</div>
                    <div className="text-2xl font-black font-mono">
                      {performance.correctPredictions}<span className="text-muted-foreground text-base">/{performance.totalPredictions}</span>
                    </div>
                  </div>
                  <div className="bg-muted rounded-xl p-4 border border-border">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Home Win</div>
                    <div className="text-xl font-bold font-mono">{(performance.homeWinAccuracy ?? 0).toFixed(1)}%</div>
                  </div>
                  <div className="bg-muted rounded-xl p-4 border border-border">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Away Win</div>
                    <div className="text-xl font-bold font-mono">{(performance.awayWinAccuracy ?? 0).toFixed(1)}%</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground font-mono text-sm">Run some predictions to see performance data.</div>
              )}
            </CardContent>
          </Card>

          {/* Weights */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="uppercase tracking-wider text-xs flex items-center gap-2 text-muted-foreground">
                  <Brain className="w-4 h-4" /> Algorithm Weights
                </CardTitle>
                {editingWeights && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground" onClick={() => setEditingWeights(false)}>
                      <X className="w-3.5 h-3.5" /> Cancel
                    </Button>
                    <Button size="sm" className="h-7 gap-1 text-xs font-bold" onClick={saveWeights} disabled={updateModelMutation.isPending}>
                      <Check className="w-3.5 h-3.5" /> Save
                    </Button>
                  </div>
                )}
              </div>
              {!editingWeights && (
                <CardDescription className="text-xs">Internal calibration of this prediction engine.</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {factorKeys.map(key => {
                  const val = editingWeights
                    ? (pendingWeights[key] ?? 50)
                    : (model[key as keyof typeof model] as number) ?? 0;
                  const Icon = FACTOR_ICONS[key]!;
                  return (
                    <div key={key} className="flex items-center gap-4">
                      <div className="w-32 flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                        <span className="truncate text-xs">{FACTOR_LABELS[key]}</span>
                      </div>
                      {editingWeights ? (
                        <div className="flex-1 flex items-center gap-3">
                          <Slider
                            value={[val]}
                            onValueChange={vals => setPendingWeights(w => ({ ...w, [key]: vals[0] }))}
                            max={100}
                            step={5}
                            className="flex-1"
                          />
                          <span className="font-mono font-bold text-xs text-primary w-10 text-right">{val}%</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${val >= 70 ? "bg-primary" : val >= 40 ? "bg-primary/60" : "bg-muted-foreground/30"}`}
                              style={{ width: `${val}%` }}
                            />
                          </div>
                          <div className="w-10 text-right font-mono font-bold text-xs text-muted-foreground">{val}%</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Status */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="uppercase tracking-wider text-xs text-muted-foreground">Engine Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Algorithm</span>
                <span className={`font-mono font-bold text-xs uppercase ${algoColor.split(" ")[0]}`}>
                  {model.algorithmType?.replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Visibility</span>
                <Badge variant={model.isPublic ? "default" : "secondary"} className={`text-[10px] ${model.isPublic ? "bg-primary text-primary-foreground" : ""}`}>
                  {model.isPublic ? "PUBLIC" : "PRIVATE"}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Market</span>
                <span className="font-semibold text-xs">{model.isForSale ? `$${model.price}` : "Not listed"}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Streak</span>
                <span className="font-mono font-bold text-xs">{performance?.streak ? `W${performance.streak}` : "—"}</span>
              </div>

              {isOwner && !model.isForSale && (
                <div className="pt-3 border-t border-border space-y-2">
                  <Button variant="outline" className="w-full uppercase font-bold tracking-wider text-xs gap-2" size="sm">
                    <Tag className="w-3.5 h-3.5" /> List for Sale
                  </Button>
                </div>
              )}

              <div className="pt-3 border-t border-border">
                <Link href="/">
                  <Button className="w-full uppercase font-bold tracking-wider text-xs" size="sm">
                    Run on a Match
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
