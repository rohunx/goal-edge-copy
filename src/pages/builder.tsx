import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateModel } from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Target, Activity, Zap, Dna, Shield, TrendingUp, Thermometer, Database, Brain, CheckCircle2, BarChart3 } from "lucide-react";
import { ModelInputAlgorithmType } from "@/api-client";

const ALGORITHMS = [
  {
    value: "bayesian",
    label: "Bayesian Network",
    desc: "Starts with a sensible baseline, then adjusts as match clues come in. Good when you do not have much data yet.",
    strength: "Pros: cautious and explainable. Cons: can be slower to adapt to surprises.",
    color: "border-blue-500/40 bg-blue-500/5 text-blue-400",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  {
    value: "poisson",
    label: "Poisson Distribution",
    desc: "Focuses on likely goal counts from each team, then turns that into win, draw, or loss chances.",
    strength: "Pros: strong for scorelines and totals. Cons: less useful for messy tactical context.",
    color: "border-violet-500/40 bg-violet-500/5 text-violet-400",
    badgeColor: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  },
  {
    value: "elo",
    label: "Elo Rating",
    desc: "Rates teams like a ladder. Beating strong teams raises a team more than beating weak teams.",
    strength: "Pros: simple and stable. Cons: can miss injuries, lineup changes, and style matchups.",
    color: "border-amber-500/40 bg-amber-500/5 text-amber-400",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  {
    value: "neural",
    label: "Neural Network",
    desc: "Looks for hidden patterns across many signals at once. Best when there is lots of reliable history.",
    strength: "Pros: can catch subtle patterns. Cons: harder to explain and needs more data.",
    color: "border-pink-500/40 bg-pink-500/5 text-pink-400",
    badgeColor: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  },
  {
    value: "random_forest",
    label: "Random Forest",
    desc: "Asks many simple decision trees for an opinion, then combines their votes into one pick.",
    strength: "Pros: balanced and forgiving. Cons: may be less sharp on unusual matches.",
    color: "border-emerald-500/40 bg-emerald-500/5 text-emerald-400",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  {
    value: "ensemble",
    label: "Ensemble Method",
    desc: "Blends several model styles so one weak signal does not dominate the final prediction.",
    strength: "Pros: reliable all-rounder. Cons: less specialized than a focused model.",
    color: "border-orange-500/40 bg-orange-500/5 text-orange-400",
    badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  {
    value: "linear",
    label: "Linear Regression",
    desc: "Uses your sliders directly: higher-weighted factors have more influence on the pick.",
    strength: "Pros: easiest to understand. Cons: can miss complex interactions between teams.",
    color: "border-cyan-500/40 bg-cyan-500/5 text-cyan-400",
    badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  },
] as const;

const FACTORS = [
  { id: "weightTeamForm", label: "Team Form", icon: Activity, desc: "Recent wins, draws, losses — current momentum" },
  { id: "weightHomeAdvantage", label: "Home Advantage", icon: Shield, desc: "How much the home crowd & pitch familiarity matters" },
  { id: "weightInjuries", label: "Injuries", icon: Zap, desc: "Impact of missing key players on team performance" },
  { id: "weightHeadToHead", label: "Head-to-Head", icon: Dna, desc: "Historical results between these specific teams" },
  { id: "weightPlayerStrength", label: "Player Strength", icon: Target, desc: "Individual quality and overall squad depth" },
  { id: "weightMarketOdds", label: "Market Odds", icon: Database, desc: "Betting market wisdom as a signal for match probabilities" },
  { id: "weightRecentForm", label: "Recent Form", icon: TrendingUp, desc: "Last 5 matches — short-term performance trend" },
  { id: "weightWeather", label: "Weather Impact", icon: Thermometer, desc: "Pitch conditions, temperature, and weather effects" },
];

function getWeightColor(val: number) {
  if (val >= 75) return "bg-primary";
  if (val >= 50) return "bg-primary/70";
  if (val >= 25) return "bg-primary/40";
  return "bg-muted-foreground/30";
}

export default function Builder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createModelMutation = useCreateModel();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [algorithm, setAlgorithm] = useState<ModelInputAlgorithmType>("ensemble");
  const [isPublic, setIsPublic] = useState(true);
  const [price, setPrice] = useState("0");
  const [weights, setWeights] = useState<Record<string, number>>(
    FACTORS.reduce((acc, f) => ({ ...acc, [f.id]: 50 }), {})
  );

  const selectedAlgo = ALGORITHMS.find(a => a.value === algorithm)!;
  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);
  const topFactors = [...FACTORS].sort((a, b) => weights[b.id] - weights[a.id]).slice(0, 3);

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "Missing name", description: "Enter a name for your model.", variant: "destructive" });
      return;
    }
    createModelMutation.mutate({
      data: {
        name,
        description,
        algorithmType: algorithm,
        isPublic,
        isForSale: isPublic,
        price: isPublic ? Number(price || 0) : null,
        ...weights,
      }
    }, {
      onSuccess: (model) => {
        toast({ title: "Model deployed!", description: `${name} is ready in My Models.` });
        setLocation(`/model/${model.id}`);
      },
      onError: () => toast({ title: "Error", description: "Failed to create model.", variant: "destructive" })
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Model Builder</h1>
        <p className="text-muted-foreground mt-1 text-sm">Configure your prediction engine — no math required.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Config */}
        <div className="lg:col-span-2 space-y-5">
          {/* Name */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="uppercase tracking-wider text-xs text-muted-foreground">Model Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-semibold">Model Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Apex Predator v2 · Night Mode"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-sm font-semibold">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  id="desc"
                  placeholder="Describe your tactical approach..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="uppercase tracking-wider text-xs text-muted-foreground">Visibility</CardTitle>
              <CardDescription className="text-xs">Choose who can find and use this model after deployment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`text-left rounded-lg border p-4 transition-all ${!isPublic ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:border-muted-foreground/30"}`}
                >
                  <div className="font-bold text-sm">Private</div>
                  <div className="text-xs text-muted-foreground mt-1">Only you can see it, manage it, and use it for match predictions.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`text-left rounded-lg border p-4 transition-all ${isPublic ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:border-muted-foreground/30"}`}
                >
                  <div className="font-bold text-sm">Public Marketplace</div>
                  <div className="text-xs text-muted-foreground mt-1">Other users can discover it and add it to their match toolkit.</div>
                </button>
              </div>
              {isPublic && (
                <div className="max-w-xs space-y-1.5">
                  <Label htmlFor="price" className="text-sm font-semibold">Marketplace Price</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="font-mono"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                <span>{isPublic ? "Public models can appear in Marketplace." : "Private models stay in your account only."}</span>
              </div>
            </CardContent>
          </Card>

          {/* Algorithm Picker */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="uppercase tracking-wider text-xs text-muted-foreground">Algorithm</CardTitle>
              <CardDescription className="text-xs">Choose the mathematical engine that drives predictions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALGORITHMS.map(algo => (
                  <button
                    key={algo.value}
                    onClick={() => setAlgorithm(algo.value as ModelInputAlgorithmType)}
                    className={`text-left p-3 rounded-lg border transition-all ${algorithm === algo.value ? `${algo.color} border-2` : "border-border hover:border-muted-foreground/30 bg-muted/20"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className={`font-bold text-sm ${algorithm === algo.value ? "" : "text-foreground"}`}>{algo.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{algo.desc}</div>
                        <div className={`text-[10px] font-semibold mt-1.5 ${algorithm === algo.value ? "" : "text-muted-foreground"}`}>{algo.strength}</div>
                      </div>
                      {algorithm === algo.value && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Factor Weights */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="uppercase tracking-wider text-xs text-muted-foreground">Factor Calibration</CardTitle>
              <CardDescription className="text-xs">Drag sliders to set how much each factor influences predictions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {FACTORS.map(factor => (
                <div key={factor.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <factor.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <Label className="text-sm font-semibold">{factor.label}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground hidden sm:block">{factor.desc}</span>
                      <span className={`font-mono text-xs font-black w-10 text-right ${weights[factor.id] >= 75 ? "text-primary" : weights[factor.id] <= 25 ? "text-muted-foreground/60" : "text-foreground"}`}>
                        {weights[factor.id]}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[weights[factor.id]]}
                      onValueChange={vals => setWeights(w => ({ ...w, [factor.id]: vals[0] }))}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden shrink-0">
                      <div className={`h-full rounded-full transition-all ${getWeightColor(weights[factor.id])}`} style={{ width: `${weights[factor.id]}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Diagnostics */}
        <div className="space-y-5">
          <Card className="sticky top-6">
            <CardHeader className="pb-3 bg-muted/30 border-b border-border rounded-t-xl">
              <CardTitle className="uppercase tracking-wider text-xs flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Diagnostics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
              {/* Current config */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Engine</div>
                <div className="border-l-2 border-primary pl-3 py-1 space-y-1">
                  <div className="font-mono text-sm font-bold text-foreground">{name || "UNNAMED_MODEL"}</div>
                  <Badge variant="outline" className={`text-[10px] font-bold ${selectedAlgo.badgeColor}`}>
                    {selectedAlgo.label}
                  </Badge>
                </div>
              </div>

              {/* Top factors */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Top Factors</div>
                <div className="space-y-2">
                  {topFactors.map((f, i) => (
                    <div key={f.id} className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground w-4">#{i + 1}</span>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-xs font-semibold">{f.label}</span>
                        <span className="font-mono text-xs text-primary font-bold">{weights[f.id]}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Radar preview */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Weight Distribution</div>
                <div className="space-y-1.5">
                  {FACTORS.map(f => (
                    <div key={f.id} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-20 truncate">{f.label.split(" ")[0]}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${getWeightColor(weights[f.id])}`} style={{ width: `${weights[f.id]}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full font-black uppercase tracking-wider"
                onClick={handleSave}
                disabled={createModelMutation.isPending || !name.trim()}
              >
                {createModelMutation.isPending ? "Deploying..." : "Deploy Model"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}