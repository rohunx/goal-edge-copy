import { useParams } from "wouter";
import { useAvailableModels, useGetMatch, useGetMatchPredictions, useRunPrediction } from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Clock, Activity, Target, CircleDot, BarChart3, MapPin } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMatchPredictionsQueryKey } from "@/api-client";

function TeamLogo({ logo, name, size = "lg" }: { logo?: string | null; name: string; size?: "lg" | "xl" }) {
  const s = size === "xl" ? "w-20 h-20" : "w-14 h-14";
  return (
    <div className={`${s} rounded-full bg-card border-2 border-muted flex items-center justify-center overflow-hidden`}>
      {logo
        ? <img src={logo} alt={name} className="w-[75%] h-[75%] object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        : <span className="font-black text-xl text-muted-foreground">{name.substring(0, 3).toUpperCase()}</span>}
    </div>
  );
}

function StatBar({ label, home, away, invertColor = false }: { label: string; home: number; away: number; invertColor?: boolean }) {
  const total = home + away;
  if (total === 0) return null;
  const homeP = Math.round((home / total) * 100);
  const awayP = 100 - homeP;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="font-mono font-bold text-sm text-primary">{home}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
        <span className="font-mono font-bold text-sm text-muted-foreground">{away}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
        <div className="bg-primary/80 rounded-l-full transition-all" style={{ width: `${homeP}%` }} />
        <div className="bg-muted-foreground/30 rounded-r-full transition-all" style={{ width: `${awayP}%` }} />
      </div>
    </div>
  );
}

function OddsSection({ homeOdds, drawOdds, awayOdds, homeTeam, awayTeam }: any) {
  if (!homeOdds || !drawOdds || !awayOdds) return null;
  const toProb = (o: number) => 1 / o;
  const total = toProb(homeOdds) + toProb(drawOdds) + toProb(awayOdds);
  const homeP = Math.round((toProb(homeOdds) / total) * 100);
  const drawP = Math.round((toProb(drawOdds) / total) * 100);
  const awayP = 100 - homeP - drawP;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="uppercase tracking-wider text-xs text-muted-foreground">Market Odds</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded p-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Home</div>
            <div className="font-mono font-bold text-primary">{homeOdds.toFixed(2)}</div>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Draw</div>
            <div className="font-mono font-bold text-foreground">{drawOdds.toFixed(2)}</div>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Away</div>
            <div className="font-mono font-bold text-foreground">{awayOdds.toFixed(2)}</div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            <div className="bg-primary/80 rounded-l-full" style={{ width: `${homeP}%` }} />
            <div className="bg-muted-foreground/30" style={{ width: `${drawP}%` }} />
            <div className="bg-destructive/60 rounded-r-full" style={{ width: `${awayP}%` }} />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
            <span className="text-primary">{homeP}% win</span>
            <span>{drawP}% draw</span>
            <span className="text-destructive/80">{awayP}% win</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MatchDetail() {
  const { id } = useParams();
  const matchId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: match, isLoading: loadingMatch } = useGetMatch(matchId, {
    query: { enabled: !!matchId, queryKey: ["match", matchId], refetchInterval: 30_000 }
  });
  const { data: predictions, isLoading: loadingPredictions } = useGetMatchPredictions(matchId, {
    query: { enabled: !!matchId, queryKey: getGetMatchPredictionsQueryKey(matchId) }
  });
  const { data: availableModels } = useAvailableModels();
  const runPrediction = useRunPrediction();

  const [selectedModelId, setSelectedModelId] = useState<string>("");

  const handleRunPrediction = () => {
    if (!selectedModelId) return;
    runPrediction.mutate({
      id: parseInt(selectedModelId, 10),
      data: { matchId }
    }, {
      onSuccess: () => {
        toast({ title: "Pick generated", description: "Your model has analyzed this match." });
        queryClient.invalidateQueries({ queryKey: getGetMatchPredictionsQueryKey(matchId) });
      },
      onError: () => toast({ title: "Error", description: "Failed to generate prediction.", variant: "destructive" })
    });
  };

  if (loadingMatch) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-[220px] w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[200px] col-span-2 rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!match) return <div className="text-center py-12 font-mono text-muted-foreground">Match not found.</div>;

  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const hasStats = match.homeShots != null || match.homePossession != null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Match Header */}
      <Card className={`overflow-hidden border-2 ${isLive ? "border-primary shadow-md shadow-primary/10" : "border-border"}`}>
        <div className="bg-muted/50 px-5 py-2.5 flex items-center justify-between border-b border-border">
          <span className="font-bold text-muted-foreground uppercase tracking-widest text-xs">{match.league}</span>
          {isLive ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <Badge className="bg-destructive text-white text-xs font-bold">LIVE {match.minute ? `${match.minute}'` : ""}</Badge>
            </div>
          ) : isFinished ? (
            <span className="text-muted-foreground font-mono text-xs bg-muted rounded px-2 py-0.5">FULL TIME</span>
          ) : (
            <span className="text-muted-foreground font-mono text-sm flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {format(new Date(match.kickoffTime), "PPP · HH:mm")}
            </span>
          )}
        </div>

        <CardContent className="px-6 py-8">
          <div className="flex items-center justify-between">
            {/* Home team */}
            <div className="flex flex-col items-center gap-3 flex-1">
              <TeamLogo logo={match.homeTeamLogo} name={match.homeTeam} size="xl" />
              <span className="font-black text-lg text-center leading-tight">{match.homeTeam}</span>
              {match.status === "upcoming" && match.homeOdds && (
                <Badge variant="outline" className="font-mono text-xs">{match.homeOdds.toFixed(2)}</Badge>
              )}
            </div>

            {/* Score */}
            <div className="px-6 flex flex-col items-center shrink-0">
              {match.status === "upcoming" ? (
                <div className="text-3xl font-black text-muted-foreground/30 tracking-widest uppercase">VS</div>
              ) : (
                <div className={`text-6xl font-black font-mono flex items-center gap-3 ${isLive ? "text-primary" : "text-foreground"}`}>
                  <span>{match.homeScore ?? 0}</span>
                  <span className="text-muted-foreground/30 text-3xl">—</span>
                  <span>{match.awayScore ?? 0}</span>
                </div>
              )}
              {match.status === "upcoming" && match.drawOdds && (
                <Badge variant="outline" className="mt-4 font-mono text-xs text-muted-foreground">DRAW {match.drawOdds.toFixed(2)}</Badge>
              )}
            </div>

            {/* Away team */}
            <div className="flex flex-col items-center gap-3 flex-1">
              <TeamLogo logo={match.awayTeamLogo} name={match.awayTeam} size="xl" />
              <span className="font-black text-lg text-center leading-tight">{match.awayTeam}</span>
              {match.status === "upcoming" && match.awayOdds && (
                <Badge variant="outline" className="font-mono text-xs">{match.awayOdds.toFixed(2)}</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Stats + Predictions */}
        <div className="md:col-span-2 space-y-6">
          {/* Live Stats */}
          {hasStats && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="uppercase tracking-wider text-xs flex items-center gap-2 text-muted-foreground">
                  <BarChart3 className="w-4 h-4" /> Match Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {match.homePossession != null && match.awayPossession != null && (
                    <StatBar label="Possession %" home={match.homePossession} away={match.awayPossession} />
                  )}
                  {match.homeShots != null && match.awayShots != null && (
                    <StatBar label="Total Shots" home={match.homeShots} away={match.awayShots} />
                  )}
                  {match.homeShotsOnTarget != null && match.awayShotsOnTarget != null && (
                    <StatBar label="Shots on Target" home={match.homeShotsOnTarget} away={match.awayShotsOnTarget} />
                  )}
                  {match.homeCorners != null && match.awayCorners != null && (
                    <StatBar label="Corner Kicks" home={match.homeCorners} away={match.awayCorners} />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Community Predictions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="uppercase tracking-wider text-xs flex items-center gap-2 text-muted-foreground">
                <Target className="w-4 h-4" /> Community Predictions
                {predictions && predictions.length > 0 && (
                  <span className="ml-auto font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{predictions.length}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPredictions ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : predictions && predictions.length > 0 ? (
                <div className="space-y-2">
                  {predictions.map(pred => {
                    const outcomeColor = pred.predictedOutcome === "home_win" ? "text-primary" : pred.predictedOutcome === "away_win" ? "text-destructive/80" : "text-muted-foreground";
                    return (
                      <div key={pred.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                        <div className="flex items-center gap-3 min-w-0">
                          <CircleDot className="text-muted-foreground w-4 h-4 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate">{pred.modelName}</div>
                            {pred.isPlaceholder && (
                              <div className="text-[10px] text-amber-500 font-mono uppercase">{pred.disclaimer || "Prediction is a placeholder"}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className={`font-bold text-xs uppercase ${outcomeColor}`}>
                            {pred.predictedOutcome.replace("_", " ")}
                          </span>
                          <div className="text-right">
                            <div className="font-mono font-bold text-primary text-sm">{pred.confidence.toFixed(0)}%</div>
                            <Progress value={pred.confidence} className="h-1 w-16" />
                          </div>
                          {pred.isCorrect !== null && (
                            <Badge variant={pred.isCorrect ? "default" : "destructive"} className={pred.isCorrect ? "bg-primary text-primary-foreground text-[10px]" : "text-[10px]"}>
                              {pred.isCorrect ? "✓" : "✗"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm font-mono">
                  No predictions for this match yet — run yours below.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Actions + Info */}
        <div className="space-y-4">
          {/* Run Analysis (upcoming) */}
          {match.status === "upcoming" && (
            <Card className="border-primary/40 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="uppercase tracking-wider text-xs text-primary">Run Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                  <SelectTrigger className="font-mono text-sm">
                    <SelectValue placeholder="Choose your model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels?.map(m => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        <div>
                          <div className="font-bold text-sm">{m.name}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">
                            {m.algorithmType} - {m.isOwned ? "Your model" : "Marketplace"}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableModels && availableModels.length === 0 && (
                  <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground font-mono">
                    Build a model or add one from Marketplace before running a prediction.
                  </div>
                )}
                <Button
                  className="w-full font-bold uppercase tracking-wider text-sm"
                  onClick={handleRunPrediction}
                  disabled={!selectedModelId || runPrediction.isPending || !availableModels?.length}
                >
                  {runPrediction.isPending ? "Processing…" : "Generate Pick"}
                </Button>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-600 font-mono">
                  Prediction is a placeholder — Model in Maintenance Mode.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Odds */}
          <OddsSection
            homeOdds={match.homeOdds}
            drawOdds={match.drawOdds}
            awayOdds={match.awayOdds}
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
          />

          {/* Venue Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="uppercase tracking-wider text-xs flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" /> Venue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Stadium</span>
                <span className="font-semibold text-right max-w-[60%] truncate">{match.venue || "Unknown"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Competition</span>
                <span className="font-semibold text-right max-w-[60%] truncate">{match.league}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}