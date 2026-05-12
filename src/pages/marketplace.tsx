import { useListMarketplace } from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Store, Trophy, User, Target, Search, SlidersHorizontal } from "lucide-react";
import { useState, useMemo } from "react";

const ALGORITHM_LABELS: Record<string, string> = {
  bayesian: "Bayesian",
  linear: "Linear",
  poisson: "Poisson",
  elo: "Elo Rating",
  neural: "Neural Net",
  random_forest: "Random Forest",
  ensemble: "Ensemble",
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

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [algoFilter, setAlgoFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"accuracy" | "price" | "popular" | "recent">("accuracy");

  const { data: listings, isLoading } = useListMarketplace({ algorithmType: algoFilter !== "all" ? algoFilter : undefined, sortBy });

  const filtered = useMemo(() => {
    if (!listings) return [];
    return listings.filter(l =>
      !searchQuery ||
      l.modelName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.sellerUsername?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [listings, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Marketplace</h1>
        <p className="text-muted-foreground mt-1 text-sm">Discover and acquire top-performing prediction models.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search models or creators..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 font-mono text-sm"
          />
        </div>
        <Select value={algoFilter} onValueChange={setAlgoFilter}>
          <SelectTrigger className="w-full sm:w-44 font-mono text-sm">
            <SlidersHorizontal className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Algorithm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Algorithms</SelectItem>
            {Object.entries(ALGORITHM_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
          <SelectTrigger className="w-full sm:w-40 font-mono text-sm">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="accuracy">Top Accuracy</SelectItem>
            <SelectItem value="popular">Most Predictions</SelectItem>
            <SelectItem value="price">Lowest Price</SelectItem>
            <SelectItem value="recent">Recently Listed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Count */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-sm text-muted-foreground font-mono">
          Showing <span className="text-foreground font-bold">{filtered.length}</span> models
        </p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[270px] rounded-xl" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(listing => {
            const algoColor = ALGO_COLORS[listing.algorithmType ?? ""] ?? "text-muted-foreground border-muted bg-muted/20";
            const accuracy = listing.accuracyRate ?? 0;
            const accColor = accuracy >= 70 ? "text-primary" : accuracy >= 55 ? "text-amber-400" : "text-muted-foreground";
            return (
              <Card key={listing.id} className="flex flex-col border-border hover:border-primary/40 hover:shadow-md transition-all duration-200 group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className={`uppercase text-[10px] tracking-wider font-bold ${algoColor}`}>
                      {ALGORITHM_LABELS[listing.algorithmType ?? ""] ?? listing.algorithmType}
                    </Badge>
                    <div className="text-base font-black text-primary">${listing.price}</div>
                  </div>
                  <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">{listing.modelName}</CardTitle>
                  <CardDescription className="line-clamp-2 text-xs leading-relaxed">{listing.modelDescription || "No description."}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1 pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                        <Target className="w-3 h-3" /> Accuracy
                      </div>
                      <div className={`font-mono font-black text-xl ${accColor}`}>
                        {accuracy.toFixed(1)}<span className="text-sm font-normal">%</span>
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                        <Trophy className="w-3 h-3" /> Picks
                      </div>
                      <div className="font-mono font-black text-xl text-foreground">{listing.totalPredictions ?? 0}</div>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="border-t border-border pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span className="font-semibold">{listing.sellerUsername}</span>
                  </div>
                  <Link href={`/model/${listing.modelId}`}>
                    <Button size="sm" className="uppercase text-xs font-bold tracking-wider h-7 px-3">View</Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="p-16 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center bg-card/50">
          <Store className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-bold text-foreground">Nothing found</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs">
            {searchQuery || algoFilter !== "all" ? "Try adjusting your filters." : "No models listed yet — build one and list it!"}
          </p>
          {!searchQuery && algoFilter === "all" && (
            <Link href="/builder" className="mt-5">
              <Button>Build a Model</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
