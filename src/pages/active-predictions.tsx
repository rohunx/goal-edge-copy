import { useCurrentUser, useListPredictions } from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Clock, Gauge, Target } from "lucide-react";
import { Link } from "wouter";

function outcomeLabel(outcome: string) {
  return outcome.replace("_", " ").toUpperCase();
}

export default function ActivePredictions() {
  const { data: user } = useCurrentUser();
  const { data: predictions, isLoading } = useListPredictions(
    user ? { userId: user.id } : undefined,
    { query: { enabled: Boolean(user), refetchInterval: 60_000 } }
  );
  const active = (predictions ?? []).filter((prediction) => prediction.isCorrect === null);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
          <Activity className="w-7 h-7 text-primary" />
          Active Predictions
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Track open picks that are waiting for final match results.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}
        </div>
      ) : active.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {active.map((prediction) => (
            <Card key={prediction.id} className="border-border hover:border-primary/40 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-black truncate">
                      {prediction.homeTeam} vs {prediction.awayTeam}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      Model: <span className="font-semibold text-foreground">{prediction.modelName}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-primary/30 text-primary">
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/60 p-3 border border-border">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                      <Target className="w-3 h-3" /> Pick
                    </div>
                    <div className="font-mono font-black text-sm text-foreground">{outcomeLabel(prediction.predictedOutcome)}</div>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3 border border-border">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                      <Gauge className="w-3 h-3" /> Confidence
                    </div>
                    <div className="font-mono font-black text-sm text-primary">{prediction.confidence.toFixed(0)}%</div>
                  </div>
                </div>
                <Progress value={prediction.confidence} className="h-1.5" />
                <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                  <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Created {new Date(prediction.createdAt).toLocaleDateString()}
                  </div>
                  <Link href={`/match/${prediction.matchId}`}>
                    <Button size="sm" variant="outline" className="h-7 uppercase text-xs font-bold">View Match</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="p-16 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center bg-card/50">
          <Activity className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-bold">No Active Predictions</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs">Choose an upcoming match and run one of your available models.</p>
          <Link href="/" className="mt-5">
            <Button>Find Matches</Button>
          </Link>
        </div>
      )}
    </div>
  );
}