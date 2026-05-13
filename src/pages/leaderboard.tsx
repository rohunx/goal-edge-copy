import { useGetLeaderboard } from "@/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Trophy, Flame, ChevronRight, Search } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

const ALGO_COLORS: Record<string, string> = {
  bayesian: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  linear: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  poisson: "text-violet-400 border-violet-400/30 bg-violet-400/10",
  elo: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  neural: "text-pink-400 border-pink-400/30 bg-pink-400/10",
  random_forest: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  ensemble: "text-orange-400 border-orange-400/30 bg-orange-400/10",
};

const PODIUM_COLORS = [
  "text-amber-400 bg-amber-400/10 border-amber-400/30",
  "text-slate-300 bg-slate-300/10 border-slate-300/30",
  "text-amber-700 bg-amber-700/10 border-amber-700/30",
];

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const [league, setLeague] = useState("");
  const [team, setTeam] = useState("");
  const { data: leaderboard, isLoading } = useGetLeaderboard({
    limit: 50,
    league: league || undefined,
    team: team || undefined,
  });

  const top3 = leaderboard?.slice(0, 3) ?? [];
  const rest = leaderboard?.slice(3) ?? [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-3">
          <Trophy className="w-7 h-7 text-primary" />
          Global Rankings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">The most accurate prediction models on the platform.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-primary" />
            <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Ranking Focus</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input value={league} onChange={(e) => setLeague(e.target.value)} placeholder="League, e.g. Premier League" />
            <Input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Team, e.g. Arsenal" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 font-mono">
            Rankings only include predictions made before completed matches with known final scores.
          </p>
        </CardContent>
      </Card>

      {/* Podium — top 3 */}
      {!isLoading && top3.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {/* 2nd place */}
          <Link href={`/model/${top3[1]?.modelId}`} className="block mt-6">
            <Card className={`border-2 ${PODIUM_COLORS[1]} hover:shadow-md transition-all text-center p-4`}>
              <div className="text-3xl mb-2">🥈</div>
              <div className="font-black text-sm truncate">{top3[1]?.modelName}</div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">{top3[1]?.username}</div>
              <div className="font-mono font-black text-xl mt-2 text-slate-300">{top3[1]?.accuracyRate.toFixed(1)}%</div>
              <Badge variant="outline" className={`mt-2 text-[10px] ${ALGO_COLORS[top3[1]?.algorithmType ?? ""] ?? ""}`}>
                {top3[1]?.algorithmType}
              </Badge>
            </Card>
          </Link>

          {/* 1st place */}
          <Link href={`/model/${top3[0]?.modelId}`} className="block">
            <Card className={`border-2 ${PODIUM_COLORS[0]} hover:shadow-lg transition-all text-center p-5 relative`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-black font-black text-xs px-2 py-0.5 rounded-full">#1</div>
              <div className="text-4xl mb-2 mt-2">🥇</div>
              <div className="font-black text-base truncate">{top3[0]?.modelName}</div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">{top3[0]?.username}</div>
              <div className="font-mono font-black text-2xl mt-2 text-amber-400">{top3[0]?.accuracyRate.toFixed(1)}%</div>
              <Badge variant="outline" className={`mt-2 text-[10px] ${ALGO_COLORS[top3[0]?.algorithmType ?? ""] ?? ""}`}>
                {top3[0]?.algorithmType}
              </Badge>
              {top3[0]?.streak && top3[0].streak >= 3 && (
                <div className="mt-2 flex justify-center items-center gap-1 text-destructive font-bold text-xs">
                  <Flame className="w-3 h-3" /> W{top3[0].streak}
                </div>
              )}
            </Card>
          </Link>

          {/* 3rd place */}
          <Link href={`/model/${top3[2]?.modelId}`} className="block mt-10">
            <Card className={`border-2 ${PODIUM_COLORS[2]} hover:shadow-md transition-all text-center p-4`}>
              <div className="text-3xl mb-2">🥉</div>
              <div className="font-black text-sm truncate">{top3[2]?.modelName}</div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">{top3[2]?.username}</div>
              <div className="font-mono font-black text-xl mt-2 text-amber-700">{top3[2]?.accuracyRate.toFixed(1)}%</div>
              <Badge variant="outline" className={`mt-2 text-[10px] ${ALGO_COLORS[top3[2]?.algorithmType ?? ""] ?? ""}`}>
                {top3[2]?.algorithmType}
              </Badge>
            </Card>
          </Link>
        </div>
      )}

      {/* Full table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-5 py-3 font-semibold tracking-wider w-16 text-center">Rank</th>
                  <th className="px-5 py-3 font-semibold tracking-wider">Model</th>
                  <th className="px-5 py-3 font-semibold tracking-wider hidden md:table-cell">Algorithm</th>
                  <th className="px-5 py-3 font-semibold tracking-wider text-right">Accuracy</th>
                  <th className="px-5 py-3 font-semibold tracking-wider text-right hidden sm:table-cell">Record</th>
                  <th className="px-5 py-3 font-semibold tracking-wider text-center hidden sm:table-cell">Streak</th>
                  <th className="px-5 py-3 font-semibold tracking-wider w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-5 py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                ) : leaderboard && leaderboard.length > 0 ? (
                  leaderboard.map((entry, index) => {
                    const algoColor = ALGO_COLORS[entry.algorithmType ?? ""] ?? "text-muted-foreground";
                    const isTop3 = index < 3;
                    const accColor = entry.accuracyRate >= 70 ? "text-primary" : entry.accuracyRate >= 55 ? "text-amber-400" : "text-muted-foreground";
                    return (
                      <tr key={entry.modelId} className={`hover:bg-muted/30 transition-colors group ${isTop3 ? "bg-primary/3" : ""}`}>
                        <td className="px-5 py-3.5 text-center">
                          {isTop3 ? (
                            <span className="text-xl">{RANK_MEDALS[index]}</span>
                          ) : (
                            <span className="font-mono font-bold text-sm text-muted-foreground">#{entry.rank}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className={`font-bold text-sm ${isTop3 ? "text-foreground" : "text-foreground"}`}>{entry.modelName}</span>
                            <span className="text-xs text-muted-foreground mt-0.5">by {entry.username}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <Badge variant="outline" className={`text-[10px] font-mono ${algoColor}`}>
                            {entry.algorithmType}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={`font-mono font-black text-base ${accColor}`}>
                            {entry.accuracyRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                          <span className="font-mono text-xs text-muted-foreground">
                            {entry.correctPredictions} / {entry.totalPredictions}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center hidden sm:table-cell">
                          {entry.streak && entry.streak >= 3 ? (
                            <div className="inline-flex items-center gap-1 text-destructive font-bold text-xs bg-destructive/10 px-2 py-0.5 rounded-full">
                              <Flame className="w-3 h-3" /> W{entry.streak}
                            </div>
                          ) : (
                            <span className="text-muted-foreground font-mono text-xs">{entry.streak ? `W${entry.streak}` : "—"}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <Link href={`/model/${entry.modelId}`} className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground font-mono text-sm">
                      No models ranked yet — run some predictions to get on the board.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}