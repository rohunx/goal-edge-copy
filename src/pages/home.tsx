import { useListLiveMatches, useListMatches, useSyncMatches, getListLiveMatchesQueryKey, getListMatchesQueryKey } from "@/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format, isToday, isTomorrow } from "date-fns";
import { Activity, Clock, RefreshCw, Wifi, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Input } from "@/components/ui/input";

function TeamLogo({ logo, name, size = "md" }: { logo?: string | null; name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-16 h-16" };
  const textSizes = { sm: "text-[9px]", md: "text-xs", lg: "text-base" };
  return (
    <div className={`${sizes[size]} rounded-full bg-muted flex items-center justify-center border border-border shrink-0 overflow-hidden`}>
      {logo
        ? <img src={logo} alt={name} className="w-[75%] h-[75%] object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        : <span className={`font-bold ${textSizes[size]} text-muted-foreground`}>{name.substring(0, 3).toUpperCase()}</span>}
    </div>
  );
}

function OddsBar({ homeOdds, drawOdds, awayOdds }: { homeOdds?: number | null; drawOdds?: number | null; awayOdds?: number | null }) {
  if (!homeOdds || !drawOdds || !awayOdds) return null;
  const toProb = (odd: number) => (1 / odd);
  const total = toProb(homeOdds) + toProb(drawOdds) + toProb(awayOdds);
  const homeP = Math.round((toProb(homeOdds) / total) * 100);
  const drawP = Math.round((toProb(drawOdds) / total) * 100);
  const awayP = 100 - homeP - drawP;
  return (
    <div className="mt-2">
      <div className="flex h-1 rounded-full overflow-hidden gap-px">
        <div className="bg-primary/80 rounded-l-full" style={{ width: `${homeP}%` }} />
        <div className="bg-muted-foreground/40" style={{ width: `${drawP}%` }} />
        <div className="bg-destructive/70 rounded-r-full" style={{ width: `${awayP}%` }} />
      </div>
      <div className="flex justify-between mt-0.5 text-[9px] font-mono text-muted-foreground">
        <span className="text-primary/80">{homeP}%</span>
        <span>D {drawP}%</span>
        <span className="text-destructive/80">{awayP}%</span>
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: any }) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  const kickoff = new Date(match.kickoffTime);
  let dateLabel = format(kickoff, "EEE d MMM");
  if (isToday(kickoff)) dateLabel = "Today";
  if (isTomorrow(kickoff)) dateLabel = "Tomorrow";

  return (
    <Link href={`/match/${match.id}`} className="block group">
      <Card className={`overflow-hidden border transition-all duration-200 hover:shadow-md hover:border-primary/40 ${isLive ? "border-primary/60 shadow-sm shadow-primary/10" : "border-border"}`}>
        {/* Header */}
        <div className="bg-muted/60 px-3 py-1.5 flex items-center justify-between border-b border-border">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px] truncate">{match.league}</span>
          {isLive ? (
            <Badge variant="default" className="bg-destructive text-white text-[10px] font-bold animate-pulse rounded px-1.5 py-0 ml-2 shrink-0">
              LIVE {match.minute ? `${match.minute}'` : ""}
            </Badge>
          ) : isFinished ? (
            <span className="text-muted-foreground text-[10px] font-mono ml-2 shrink-0">FT</span>
          ) : (
            <span className="text-muted-foreground font-mono text-[10px] flex items-center gap-1 ml-2 shrink-0">
              <Clock className="w-2.5 h-2.5" />{format(kickoff, "HH:mm")}
            </span>
          )}
        </div>

        {/* Teams + Score */}
        <CardContent className="p-3 flex items-center gap-3">
          {/* Home */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TeamLogo logo={match.homeTeamLogo} name={match.homeTeam} size="sm" />
            <span className="font-semibold text-sm truncate">{match.homeTeam}</span>
          </div>

          {/* Score / VS */}
          <div className="shrink-0 text-center">
            {match.status === "upcoming" ? (
              <span className="font-mono text-xs text-muted-foreground/50 font-bold">VS</span>
            ) : (
              <div className="text-xl font-black font-mono flex items-center gap-1">
                <span className={isLive ? "text-primary" : ""}>{match.homeScore ?? 0}</span>
                <span className="text-muted-foreground/40 text-base">-</span>
                <span className={isLive ? "text-primary" : ""}>{match.awayScore ?? 0}</span>
              </div>
            )}
          </div>

          {/* Away */}
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span className="font-semibold text-sm truncate text-right">{match.awayTeam}</span>
            <TeamLogo logo={match.awayTeamLogo} name={match.awayTeam} size="sm" />
          </div>
        </CardContent>

        {/* Odds bar for upcoming */}
        {match.status === "upcoming" && (match.homeOdds || match.drawOdds || match.awayOdds) && (
          <div className="px-3 pb-2.5">
            <OddsBar homeOdds={match.homeOdds} drawOdds={match.drawOdds} awayOdds={match.awayOdds} />
          </div>
        )}

        {/* Live possession bar */}
        {isLive && match.homePossession != null && match.awayPossession != null && (
          <div className="px-3 pb-2">
            <div className="flex h-1 rounded-full overflow-hidden gap-px">
              <div className="bg-primary/70 rounded-l-full" style={{ width: `${match.homePossession}%` }} />
              <div className="bg-muted-foreground/30 rounded-r-full" style={{ width: `${match.awayPossession}%` }} />
            </div>
            <div className="flex justify-between mt-0.5 text-[9px] font-mono text-muted-foreground">
              <span>{match.homePossession}% poss.</span>
              <span>{match.awayPossession}%</span>
            </div>
          </div>
        )}
      </Card>
    </Link>
  );
}

function SectionHeader({ icon: Icon, title, count, color = "text-foreground" }: { icon: any; title: string; count?: number; color?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${color}`} />
        <h2 className={`text-lg font-black uppercase tracking-tight ${color}`}>{title}</h2>
        {count != null && (
          <span className="text-xs font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5">{count}</span>
        )}
      </div>
    </div>
  );
}

function MatchGrid({ matches, loading, empty }: { matches?: any[]; loading: boolean; empty: string }) {
  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
    </div>
  );
  if (!matches?.length) return (
    <div className="p-8 border border-dashed border-border/50 rounded-xl text-center">
      <p className="text-muted-foreground font-mono text-sm">{empty}</p>
    </div>
  );
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {matches.map(m => <MatchCard key={m.id} match={m} />)}
    </div>
  );
}

export default function Home() {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [team, setTeam] = useState("");
  const [league, setLeague] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const syncMutation = useSyncMatches();

  const { data: liveMatches, isLoading: loadingLive, dataUpdatedAt } = useListLiveMatches({
    query: { queryKey: getListLiveMatchesQueryKey(), refetchInterval: 30_000 }
  });
  const matchFilters = {
    status: "upcoming" as const,
    team: team || undefined,
    league: league || undefined,
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    dateTo: dateTo ? new Date(dateTo + "T23:59:59").toISOString() : undefined,
  };
  const { data: upcomingMatches, isLoading: loadingUpcoming } = useListMatches(
    matchFilters,
    { query: { queryKey: getListMatchesQueryKey(matchFilters), refetchInterval: 60_000 } }
  );

  const todayMatches = upcomingMatches?.filter(m => isToday(new Date(m.kickoffTime))) ?? [];
  const laterMatches = upcomingMatches?.filter(m => !isToday(new Date(m.kickoffTime))) ?? [];

  const handleSync = () => {
    setSyncing(true);
    syncMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast({ title: "Sync complete", description: `${result.synced} new, ${result.updated} updated` });
        setSyncing(false);
      },
      onError: () => {
        toast({ title: "Sync failed", description: "Could not reach API-Football.", variant: "destructive" });
        setSyncing(false);
      }
    });
  };

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Match Feed</h1>
          <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-primary" />
            Real-time soccer data · auto-refreshes every 30s
            {lastUpdated && <span className="text-muted-foreground/60 font-mono text-[10px]">• {format(lastUpdated, "HH:mm:ss")}</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 font-mono text-xs" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          Sync Data
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-primary" />
            <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Database Search</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Search team" />
            <Input value={league} onChange={(e) => setLeague(e.target.value)} placeholder="Filter league" />
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Live Matches */}
      <section>
        <SectionHeader
          icon={Activity}
          title="Live Now"
          count={liveMatches?.length}
          color="text-destructive"
        />
        <MatchGrid
          matches={liveMatches}
          loading={loadingLive}
          empty="No live matches right now — check back soon."
        />
      </section>

      {/* Today */}
      {(loadingUpcoming || todayMatches.length > 0) && (
        <section>
          <SectionHeader icon={Clock} title="Today" count={todayMatches.length} />
          <MatchGrid
            matches={todayMatches}
            loading={loadingUpcoming}
            empty="No more matches today."
          />
        </section>
      )}

      {/* Upcoming */}
      <section>
        <SectionHeader
          icon={Clock}
          title="Upcoming"
          count={laterMatches.length || undefined}
          color="text-muted-foreground"
        />
        <MatchGrid
          matches={laterMatches.slice(0, 18)}
          loading={loadingUpcoming && todayMatches.length === 0}
          empty="No upcoming matches found."
        />
      </section>
    </div>
  );
}
