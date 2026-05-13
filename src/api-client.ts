import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type MatchStatus = "live" | "upcoming" | "finished";
export type ModelInputAlgorithmType = "bayesian" | "linear" | "poisson" | "elo" | "neural" | "random_forest" | "ensemble";

export type User = {
  id: number;
  username: string;
  email?: string;
  avatarUrl?: string | null;
  favoriteLeague?: string | null;
  correctPredictions: number;
  totalPredictions: number;
};

export type Match = {
  id: number;
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  league: string;
  leagueId?: number | null;
  season?: number | null;
  country?: string | null;
  kickoffTime: string;
  status: MatchStatus;
  statusShort: string;
  minute?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  venue?: string | null;
  homePossession?: number | null;
  awayPossession?: number | null;
  homeShots?: number | null;
  awayShots?: number | null;
  homeShotsOnTarget?: number | null;
  awayShotsOnTarget?: number | null;
  homeCorners?: number | null;
  awayCorners?: number | null;
  homeOdds?: number | null;
  drawOdds?: number | null;
  awayOdds?: number | null;
};

export type Model = {
  id: number;
  userId: number;
  username?: string | null;
  name: string;
  description?: string | null;
  algorithmType: ModelInputAlgorithmType;
  isPublic: boolean;
  isForSale: boolean;
  price?: number | null;
  accuracyRate: number;
  correctPredictions: number;
  totalPredictions: number;
  createdAt: string;
  isOwned?: boolean;
  isAcquired?: boolean;
  accessSource?: "owned" | "acquired" | "public";
  weightTeamForm: number;
  weightHomeAdvantage: number;
  weightInjuries: number;
  weightHeadToHead: number;
  weightPlayerStrength: number;
  weightMarketOdds: number;
  weightRecentForm: number;
  weightWeather: number;
};

export type Prediction = {
  id: number;
  matchId: number;
  modelId: number;
  userId: number;
  modelName: string;
  homeTeam: string;
  awayTeam: string;
  predictedOutcome: "home_win" | "draw" | "away_win";
  confidence: number;
  placeholderProbability?: number;
  isPlaceholder?: boolean;
  disclaimer?: string;
  isCorrect: boolean | null;
  createdAt: string;
};

export type MatchQuery = {
  status?: MatchStatus;
  team?: string;
  league?: string;
  country?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type DashboardFilters = {
  league?: string;
  team?: string;
  country?: string;
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
const TOKEN_KEY = "goal_edge_access_token";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function endpoint(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getAuthToken();
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(endpoint(path), { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.detail || data?.message || `API request failed with ${response.status}`);
  }
  return data as T;
}

function toSearchParams(params?: MatchQuery) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.team) search.set("team", params.team);
  if (params?.league) search.set("league", params.league);
  if (params?.country) search.set("country", params.country);
  if (params?.dateFrom) search.set("date_from", params.dateFrom);
  if (params?.dateTo) search.set("date_to", params.dateTo);
  return search.toString();
}

export async function login(username: string, password: string) {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);
  const token = await apiRequest<{ access_token: string; token_type: string }>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  setAuthToken(token.access_token);
  return token;
}

export async function register(username: string, email: string, password: string) {
  return apiRequest<User>("/auth/register", { method: "POST", body: JSON.stringify({ username, email, password }) });
}

export function getListLiveMatchesQueryKey() { return ["matches", "live"]; }
export function getListMatchesQueryKey(params?: MatchQuery) { return ["matches", params ?? {}]; }
export function getGetMatchPredictionsQueryKey(id: number) { return ["predictions", "match", id]; }
export function getGetModelQueryKey(id: number) { return ["model", id]; }

export function useCurrentUser(options?: any) {
  return useQuery({ queryKey: ["auth", "me"], queryFn: () => apiRequest<User>("/auth/me"), retry: false, ...(options?.query ?? {}) });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) => login(username, password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
  });
}

export function useRegister() {
  return useMutation({ mutationFn: ({ username, email, password }: { username: string; email: string; password: string }) => register(username, email, password) });
}

export function useListLiveMatches(options?: any) {
  return useQuery({ queryKey: getListLiveMatchesQueryKey(), queryFn: () => apiRequest<Match[]>("/matches?status=live"), ...(options?.query ?? {}) });
}

export function useListMatches(params?: MatchQuery, options?: any) {
  return useQuery({
    queryKey: getListMatchesQueryKey(params),
    queryFn: () => apiRequest<Match[]>(`/matches${toSearchParams(params) ? `?${toSearchParams(params)}` : ""}`),
    ...(options?.query ?? {}),
  });
}

export function useSyncMatches() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<{ synced: number; updated: number }>("/matches/sync", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["matches"] }),
  });
}

export function useGetMatch(id: number, options?: any) {
  return useQuery({ queryKey: ["match", id], queryFn: () => apiRequest<Match>(`/matches/${id}`), ...(options?.query ?? {}) });
}

export function useGetMatchPredictions(matchId: number, options?: any) {
  return useQuery({
    queryKey: getGetMatchPredictionsQueryKey(matchId),
    queryFn: () => apiRequest<Prediction[]>(`/predictions?match_id=${matchId}`),
    ...(options?.query ?? {}),
  });
}

export function useRunPrediction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { matchId: number } }) =>
      apiRequest<Prediction>("/predictions/run", { method: "POST", body: JSON.stringify({ modelId: id, matchId: data.matchId }) }),
    onSuccess: (prediction) => {
      queryClient.invalidateQueries({ queryKey: getGetMatchPredictionsQueryKey(prediction.matchId) });
      queryClient.invalidateQueries({ queryKey: ["predictions"] });
      queryClient.invalidateQueries({ queryKey: ["models"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

export function useListModels(params?: { userId?: number }, options?: any) {
  const qs = params?.userId ? `?user_id=${params.userId}` : "";
  return useQuery({ queryKey: ["models", params ?? {}], queryFn: () => apiRequest<Model[]>(`/models${qs}`), ...(options?.query ?? {}) });
}

export function useAvailableModels() {
  return useQuery({ queryKey: ["models", "available"], queryFn: () => apiRequest<Model[]>("/models/available") });
}

export function useCreateModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data }: { data: Partial<Model> & { name: string; algorithmType: ModelInputAlgorithmType } }) =>
      apiRequest<Model>("/models", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useGetModel(id: number, options?: any) {
  return useQuery({ queryKey: getGetModelQueryKey(id), queryFn: () => apiRequest<Model>(`/models/${id}`), ...(options?.query ?? {}) });
}

export function useUpdateModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Model> }) => {
      const current = await apiRequest<Model>(`/models/${id}`);
      const payload = { ...current, ...data };
      return apiRequest<Model>(`/models/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    },
    onSuccess: (model) => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      queryClient.invalidateQueries({ queryKey: getGetModelQueryKey(model.id) });
    },
  });
}

export function useGetModelPerformance(id: number, options?: any) {
  return useQuery({
    queryKey: ["model-performance", id],
    queryFn: async () => {
      const model = await apiRequest<Model>(`/models/${id}`);
      return {
        accuracyRate: model.accuracyRate,
        correctPredictions: model.correctPredictions,
        totalPredictions: model.totalPredictions,
        homeWinAccuracy: Math.max(0, model.accuracyRate - 2.8),
        awayWinAccuracy: Math.max(0, model.accuracyRate - 5.1),
        streak: Math.floor(model.correctPredictions % 7),
      };
    },
    ...(options?.query ?? {}),
  });
}

export function useListMarketplace(params?: { algorithmType?: string; sortBy?: "accuracy" | "price" | "popular" | "recent" }) {
  const search = new URLSearchParams();
  if (params?.algorithmType) search.set("algorithm_type", params.algorithmType);
  if (params?.sortBy) search.set("sort_by", params.sortBy);
  return useQuery({ queryKey: ["marketplace", params], queryFn: () => apiRequest<any[]>(`/marketplace${search.toString() ? `?${search}` : ""}`) });
}

export function useAcquireModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ modelId }: { modelId: number }) =>
      apiRequest<Model>(`/marketplace/${modelId}/copy`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
}

export function useGetLeaderboard(params?: { limit?: number; league?: string; team?: string }) {
  const search = new URLSearchParams();
  search.set("limit", String(params?.limit ?? 50));
  if (params?.league) search.set("league", params.league);
  if (params?.team) search.set("team", params.team);
  return useQuery({ queryKey: ["leaderboard", params], queryFn: () => apiRequest<any[]>(`/leaderboard?${search}`) });
}

export function useListPredictions(params?: { userId?: number }, options?: any) {
  const search = new URLSearchParams();
  if (params?.userId) search.set("user_id", String(params.userId));
  return useQuery({ queryKey: ["predictions", params ?? {}], queryFn: () => apiRequest<Prediction[]>(`/predictions${search.toString() ? `?${search}` : ""}`), ...(options?.query ?? {}) });
}

export function useGetUser(id: number, options?: any) {
  return useQuery({ queryKey: ["user", id], queryFn: () => apiRequest<User>(`/users/${id}`), ...(options?.query ?? {}) });
}

export function useGetDashboardSummary(filters?: DashboardFilters) {
  const search = new URLSearchParams();
  if (filters?.league) search.set("league", filters.league);
  if (filters?.team) search.set("team", filters.team);
  if (filters?.country) search.set("country", filters.country);
  return useQuery({
    queryKey: ["dashboard-summary", filters ?? {}],
    queryFn: () => apiRequest<{ totalModels: number; averageAccuracy: number }>(`/dashboard/summary${search.toString() ? `?${search}` : ""}`),
  });
}