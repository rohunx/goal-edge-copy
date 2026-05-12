import random
from datetime import datetime
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from .auth import authenticate_user, create_access_token, get_current_user, get_password_hash
from .database import Base, engine, get_db
from .football import sync_matches
from .models import Match, Prediction, PredictionModel, User
from .schemas import DashboardSummary, MatchRead, ModelCreate, ModelRead, PredictionRead, PredictionRun, SyncResult, Token, UserCreate, UserRead

load_dotenv()
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN")
app = FastAPI(title="Goal Edge API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup() -> None:
    # Create tables only. No demo users, demo models, or demo matches are seeded.
    Base.metadata.create_all(bind=engine)

def user_read(user: User, db: Session) -> UserRead:
    total = db.query(Prediction).filter(Prediction.user_id == user.id).count()
    correct = db.query(Prediction).filter(Prediction.user_id == user.id, Prediction.is_correct == True).count()
    return UserRead(id=user.id, username=user.username, email=user.email, avatarUrl=user.avatar_url, favoriteLeague=user.favorite_league, correctPredictions=correct, totalPredictions=total)

def match_read(m: Match) -> MatchRead:
    return MatchRead(
        id=m.id, externalId=m.external_id, homeTeam=m.home_team, awayTeam=m.away_team,
        homeTeamLogo=m.home_team_logo, awayTeamLogo=m.away_team_logo, league=m.league,
        leagueId=m.league_id, season=m.season, country=m.country, kickoffTime=m.kickoff_time,
        status=m.status, statusShort=m.status_short, minute=m.minute, homeScore=m.home_score,
        awayScore=m.away_score, venue=m.venue, homePossession=m.home_possession,
        awayPossession=m.away_possession, homeShots=m.home_shots, awayShots=m.away_shots,
        homeShotsOnTarget=m.home_shots_on_target, awayShotsOnTarget=m.away_shots_on_target,
        homeCorners=m.home_corners, awayCorners=m.away_corners, homeOdds=m.home_odds,
        drawOdds=m.draw_odds, awayOdds=m.away_odds,
    )

def model_read(model: PredictionModel) -> ModelRead:
    return ModelRead(
        id=model.id, userId=model.user_id, username=model.owner.username if model.owner else None,
        name=model.name, description=model.description, algorithmType=model.algorithm_type,
        isPublic=model.is_public, isForSale=model.is_for_sale, price=model.price,
        accuracyRate=model.accuracy_rate, correctPredictions=model.correct_predictions,
        totalPredictions=model.total_predictions, createdAt=model.created_at,
        weightTeamForm=model.weight_team_form, weightHomeAdvantage=model.weight_home_advantage,
        weightInjuries=model.weight_injuries, weightHeadToHead=model.weight_head_to_head,
        weightPlayerStrength=model.weight_player_strength, weightMarketOdds=model.weight_market_odds,
        weightRecentForm=model.weight_recent_form, weightWeather=model.weight_weather,
    )

def prediction_read(p: Prediction) -> PredictionRead:
    return PredictionRead(
        id=p.id, matchId=p.match_id, modelId=p.model_id, userId=p.user_id,
        modelName=p.model.name, homeTeam=p.match.home_team, awayTeam=p.match.away_team,
        predictedOutcome=p.predicted_outcome, confidence=p.confidence,
        placeholderProbability=p.placeholder_probability, isPlaceholder=p.is_placeholder,
        disclaimer=p.disclaimer, isCorrect=p.is_correct, createdAt=p.created_at,
    )

@app.post("/api/auth/register", response_model=UserRead)
def register(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter((User.username == data.username) | (User.email == data.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    user = User(username=data.username, email=data.email, hashed_password=get_password_hash(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user_read(user, db)

@app.post("/api/auth/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username/email or password")
    return Token(access_token=create_access_token(str(user.id)))

@app.get("/api/auth/me", response_model=UserRead)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return user_read(user, db)

@app.get("/api/users/{user_id}", response_model=UserRead)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user_read(user, db)

@app.get("/api/matches", response_model=list[MatchRead])
def list_matches(
    status: str | None = None,
    team: str | None = None,
    league: str | None = None,
    country: str | None = None,
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(Match)
    if status:
        query = query.filter(Match.status == status)
    if team:
        like = f"%{team}%"
        query = query.filter(or_(Match.home_team.ilike(like), Match.away_team.ilike(like)))
    if league:
        query = query.filter(Match.league.ilike(f"%{league}%"))
    if country:
        query = query.filter(Match.country.ilike(f"%{country}%"))
    if date_from:
        query = query.filter(Match.kickoff_time >= date_from)
    if date_to:
        query = query.filter(Match.kickoff_time <= date_to)
    return [match_read(m) for m in query.order_by(Match.kickoff_time.asc()).limit(limit).all()]

@app.get("/api/matches/{match_id}", response_model=MatchRead)
def get_match(match_id: int, db: Session = Depends(get_db)):
    match = db.get(Match, match_id)
    if not match:
        raise HTTPException(404, "Match not found")
    return match_read(match)

@app.post("/api/matches/sync", response_model=SyncResult)
async def sync(db: Session = Depends(get_db)):
    return await sync_matches(db)

@app.get("/api/models", response_model=list[ModelRead])
def list_models(user_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(PredictionModel)
    if user_id:
        query = query.filter(PredictionModel.user_id == user_id)
    return [model_read(m) for m in query.order_by(PredictionModel.created_at.desc()).all()]

@app.post("/api/models", response_model=ModelRead)
def create_model(data: ModelCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    model = PredictionModel(
        user_id=user.id, name=data.name, description=data.description, algorithm_type=data.algorithmType,
        is_public=data.isPublic, is_for_sale=data.isForSale, price=data.price,
        weight_team_form=data.weightTeamForm, weight_home_advantage=data.weightHomeAdvantage,
        weight_injuries=data.weightInjuries, weight_head_to_head=data.weightHeadToHead,
        weight_player_strength=data.weightPlayerStrength, weight_market_odds=data.weightMarketOdds,
        weight_recent_form=data.weightRecentForm, weight_weather=data.weightWeather,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model_read(model)

@app.get("/api/models/{model_id}", response_model=ModelRead)
def get_model(model_id: int, db: Session = Depends(get_db)):
    model = db.get(PredictionModel, model_id)
    if not model:
        raise HTTPException(404, "Model not found")
    return model_read(model)

@app.put("/api/models/{model_id}", response_model=ModelRead)
def update_model(model_id: int, data: ModelCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    model = db.get(PredictionModel, model_id)
    if not model:
        raise HTTPException(404, "Model not found")
    if model.user_id != user.id:
        raise HTTPException(403, "You can only update your own models")
    for attr, value in {
        "name": data.name, "description": data.description, "algorithm_type": data.algorithmType,
        "is_public": data.isPublic, "is_for_sale": data.isForSale, "price": data.price,
        "weight_team_form": data.weightTeamForm, "weight_home_advantage": data.weightHomeAdvantage,
        "weight_injuries": data.weightInjuries, "weight_head_to_head": data.weightHeadToHead,
        "weight_player_strength": data.weightPlayerStrength, "weight_market_odds": data.weightMarketOdds,
        "weight_recent_form": data.weightRecentForm, "weight_weather": data.weightWeather,
    }.items():
        setattr(model, attr, value)
    db.commit()
    db.refresh(model)
    return model_read(model)

@app.delete("/api/models/{model_id}")
def delete_model(model_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    model = db.get(PredictionModel, model_id)
    if not model:
        raise HTTPException(404, "Model not found")
    if model.user_id != user.id:
        raise HTTPException(403, "You can only delete your own models")
    db.delete(model)
    db.commit()
    return {"ok": True}

@app.get("/api/marketplace")
def marketplace(algorithm_type: str | None = None, sort_by: str = "accuracy", db: Session = Depends(get_db)):
    query = db.query(PredictionModel).filter(or_(PredictionModel.is_public == True, PredictionModel.is_for_sale == True))
    if algorithm_type:
        query = query.filter(PredictionModel.algorithm_type == algorithm_type)
    models = query.all()
    if sort_by == "price":
        models.sort(key=lambda m: m.price or 0)
    elif sort_by == "popular":
        models.sort(key=lambda m: m.total_predictions, reverse=True)
    elif sort_by == "recent":
        models.sort(key=lambda m: m.created_at, reverse=True)
    else:
        models.sort(key=lambda m: m.accuracy_rate, reverse=True)
    return [{
        "id": m.id, "modelId": m.id, "modelName": m.name, "modelDescription": m.description,
        "sellerUsername": m.owner.username if m.owner else "Unknown", "algorithmType": m.algorithm_type,
        "accuracyRate": m.accuracy_rate, "totalPredictions": m.total_predictions, "price": m.price or 0,
    } for m in models]

@app.get("/api/leaderboard")
def leaderboard(limit: int = 50, db: Session = Depends(get_db)):
    models = db.query(PredictionModel).order_by(PredictionModel.accuracy_rate.desc()).limit(limit).all()
    return [{
        "rank": idx + 1, "modelId": m.id, "modelName": m.name, "username": m.owner.username if m.owner else "Unknown",
        "algorithmType": m.algorithm_type, "accuracyRate": m.accuracy_rate,
        "correctPredictions": m.correct_predictions, "totalPredictions": m.total_predictions,
        "streak": (m.correct_predictions + idx) % 8,
    } for idx, m in enumerate(models)]

@app.post("/api/predictions/run", response_model=PredictionRead)
def run_prediction(data: PredictionRun, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    match = db.get(Match, data.matchId)
    model = db.get(PredictionModel, data.modelId)
    if not match or not model:
        raise HTTPException(404, "Match or model not found")
    probability = random.randint(0, 100)
    if probability >= 60:
        outcome = "home_win"
    elif probability <= 40:
        outcome = "away_win"
    else:
        outcome = "draw"
    prediction = Prediction(
        user_id=user.id, model_id=model.id, match_id=match.id,
        predicted_outcome=outcome, confidence=probability,
        placeholder_probability=probability, is_placeholder=True,
        disclaimer="Prediction is a placeholder - Model in Maintenance Mode",
    )
    model.total_predictions += 1
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction_read(prediction)

@app.get("/api/predictions", response_model=list[PredictionRead])
def list_predictions(match_id: int | None = None, user_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Prediction)
    if match_id:
        query = query.filter(Prediction.match_id == match_id)
    if user_id:
        query = query.filter(Prediction.user_id == user_id)
    return [prediction_read(p) for p in query.order_by(Prediction.created_at.desc()).limit(100).all()]

@app.get("/api/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)):
    total = db.query(PredictionModel).count()
    avg = db.query(func.avg(PredictionModel.accuracy_rate)).scalar() or 0
    return DashboardSummary(totalModels=total, averageAccuracy=float(avg))
