from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6)

class UserRead(BaseModel):
    id: int
    username: str
    email: str
    avatarUrl: str | None = None
    favoriteLeague: str | None = None
    correctPredictions: int = 0
    totalPredictions: int = 0
    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class MatchRead(BaseModel):
    id: int
    externalId: str
    homeTeam: str
    awayTeam: str
    homeTeamLogo: str | None = None
    awayTeamLogo: str | None = None
    league: str
    leagueId: int | None = None
    season: int | None = None
    country: str | None = None
    kickoffTime: datetime
    status: str
    statusShort: str
    minute: int | None = None
    homeScore: int | None = None
    awayScore: int | None = None
    venue: str | None = None
    homePossession: int | None = None
    awayPossession: int | None = None
    homeShots: int | None = None
    awayShots: int | None = None
    homeShotsOnTarget: int | None = None
    awayShotsOnTarget: int | None = None
    homeCorners: int | None = None
    awayCorners: int | None = None
    homeOdds: float | None = None
    drawOdds: float | None = None
    awayOdds: float | None = None

class ModelCreate(BaseModel):
    name: str
    description: str | None = None
    algorithmType: str
    isPublic: bool = True
    isForSale: bool = False
    price: float | None = None
    weightTeamForm: int = 50
    weightHomeAdvantage: int = 50
    weightInjuries: int = 50
    weightHeadToHead: int = 50
    weightPlayerStrength: int = 50
    weightMarketOdds: int = 50
    weightRecentForm: int = 50
    weightWeather: int = 50

class ModelRead(ModelCreate):
    id: int
    userId: int
    username: str | None = None
    accuracyRate: float
    correctPredictions: int
    totalPredictions: int
    createdAt: datetime

class PredictionRun(BaseModel):
    matchId: int
    modelId: int

class PredictionRead(BaseModel):
    id: int
    matchId: int
    modelId: int
    userId: int
    modelName: str
    homeTeam: str
    awayTeam: str
    predictedOutcome: str
    confidence: int
    placeholderProbability: int
    isPlaceholder: bool
    disclaimer: str
    isCorrect: bool | None = None
    createdAt: datetime

class DashboardSummary(BaseModel):
    totalModels: int
    averageAccuracy: float

class SyncResult(BaseModel):
    synced: int
    updated: int
