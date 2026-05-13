import random
from datetime import datetime
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_
from sqlalchemy.orm import Session
from .auth import authenticate_user, create_access_token, get_current_user, get_optional_user, get_password_hash
from .database import Base, engine, get_db
from .football import sync_matches
from .models import AcquiredModel, Match, Prediction, PredictionModel, User
from .schemas import DashboardSummary, MatchRead, ModelCreate, ModelRead, PredictionRead, PredictionRun, SyncResult, Token, UserCreate, UserRead

load_dotenv()
app = FastAPI(title="Goal Edge API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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

def final_outcome(match: Match) -> str | None:
    if match.home_score is None or match.away_score is None:
        return None
    if match.home_score > match.away_score:
        return "home_win"
    if match.away_score > match.home_score:
        return "away_win"
    return "draw"

def prediction_is_rankable(p: Prediction) -> bool:
    return p.match.status == "finished" and p.created_at <= p.match.kickoff_time and final_outcome(p.match) is not None

def refresh_model_stats(db: Session, model: PredictionModel) -> None:
    rankable = [p for p in model.predictions if prediction_is_rankable(p)]
    total = len(rankable)
    correct = 0
    for prediction in rankable:
        actual = final_outcome(prediction.match)
        prediction.is_correct = actual == prediction.predicted_outcome
        if prediction.is_correct:
            correct += 1
    model.total_predictions = total
    model.correct_predictions = correct
    model.accuracy_rate = round((correct / total) * 100, 2) if total else 0

def user_has_model_access(db: Session, user: User, model: PredictionModel) -> bool:
    if model.user_id == user.id:
        return True
    if db.query(AcquiredModel).filter(AcquiredModel.user_id == user.id, AcquiredModel.model_id == model.id).first():
        return True
    return model.is_public or model.is_for_sale

def user_can_run_model(db: Session, user: User, model: PredictionModel) -> bool:
    if model.user_id == user.id:
        return True
    return db.query(AcquiredModel).filter(AcquiredModel.user_id == user.id, AcquiredModel.model_id == model.id).first() is not None

def model_read(model: PredictionModel, current_user: User | None = None, acquired_ids: set[int] | None = None) -> ModelRead:
    acquired_ids = acquired_ids or set()
    is_owned = bool(current_user and model.user_id == current_user.id)
    is_acquired = bool(model.id in acquired_ids and not is_owned)
    return ModelRead(
        id=model.id, userId=model.user_id, username=model.owner.username if model.owner else None,
        name=model.name, description=model.description, algorithmType=model.algorithm_type,
        isPublic=model.is_public, isForSale=model.is_for_sale, price=model.price,
        accuracyRate=model.accuracy_rate, correctPredictions=model.correct_predictions,
        totalPredictions=model.total_predictions, createdAt=model.created_at,
        isOwned=is_owned, isAcquired=is_acquired,
        accessSource="owned" if is_owned else "acquired" if is_acquired else "public",
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
def list_models(user_id: int | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    acquired_ids = {row.model_id for row in db.query(AcquiredModel).filter(AcquiredModel.user_id == user.id).all()}
    query = db.query(PredictionModel)
    if user_id:
        if user_id == user.id:
            query = query.filter(PredictionModel.user_id == user.id)
        else:
            query = query.filter(PredictionModel.user_id == user_id, PredictionModel.is_public == True)
    else:
        query = query.filter(or_(PredictionModel.user_id == user.id, PredictionModel.id.in_(acquired_ids), PredictionModel.is_public == True))
    models = query.order_by(PredictionModel.created_at.desc()).all()
    for model in models:
        refresh_model_stats(db, model)
    db.commit()
    return [model_read(m, user, acquired_ids) for m in models]

@app.get("/api/models/available", response_model=list[ModelRead])
def available_models(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    acquired_ids = {row.model_id for row in db.query(AcquiredModel).filter(AcquiredModel.user_id == user.id).all()}
    models = db.query(PredictionModel).filter(or_(PredictionModel.user_id == user.id, PredictionModel.id.in_(acquired_ids))).order_by(PredictionModel.created_at.desc()).all()
    for model in models:
        refresh_model_stats(db, model)
    db.commit()
    return [model_read(m, user, acquired_ids) for m in models]

@app.post("/api/models", response_model=ModelRead)
def create_model(data: ModelCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    model = PredictionModel(
        user_id=user.id, name=data.name, description=data.description, algorithm_type=data.algorithmType,
        is_public=data.isPublic, is_for_sale=data.isPublic and data.price is not None, price=data.price if data.isPublic else None,
        weight_team_form=data.weightTeamForm, weight_home_advantage=data.weightHomeAdvantage,
        weight_injuries=data.weightInjuries, weight_head_to_head=data.weightHeadToHead,
        weight_player_strength=data.weightPlayerStrength, weight_market_odds=data.weightMarketOdds,
        weight_recent_form=data.weightRecentForm, weight_weather=data.weightWeather,
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model_read(model, user)

@app.get("/api/models/{model_id}", response_model=ModelRead)
def get_model(model_id: int, user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    model = db.get(PredictionModel, model_id)
    if not model:
        raise HTTPException(404, "Model not found")
    if not model.is_public and not model.is_for_sale:
        if not user or not user_has_model_access(db, user, model):
            raise HTTPException(404, "Model not found")
    refresh_model_stats(db, model)
    db.commit()
    acquired_ids = set()
    if user:
        acquired_ids = {row.model_id for row in db.query(AcquiredModel).filter(AcquiredModel.user_id == user.id).all()}
    return model_read(model, user, acquired_ids)

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
    return model_read(model, user)

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
    query = db.query(PredictionModel).filter(PredictionModel.is_public == True)
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

@app.post("/api/marketplace/{model_id}/copy", response_model=ModelRead)
def copy_marketplace_model(model_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    model = db.get(PredictionModel, model_id)
    if not model or not model.is_public:
        raise HTTPException(404, "Model not found")
    if model.user_id == user.id:
        return model_read(model, user)
    existing = db.query(AcquiredModel).filter(AcquiredModel.user_id == user.id, AcquiredModel.model_id == model.id).first()
    if not existing:
        db.add(AcquiredModel(user_id=user.id, model_id=model.id))
        db.commit()
    acquired_ids = {model.id}
    return model_read(model, user, acquired_ids)

@app.get("/api/leaderboard")
def leaderboard(limit: int = 50, league: str | None = None, team: str | None = None, db: Session = Depends(get_db)):
    models = db.query(PredictionModel).all()
    ranked = []
    for model in models:
        refresh_model_stats(db, model)
        predictions = [p for p in model.predictions if prediction_is_rankable(p)]
        if league:
            predictions = [p for p in predictions if p.match.league and league.lower() in p.match.league.lower()]
        if team:
            predictions = [p for p in predictions if team.lower() in p.match.home_team.lower() or team.lower() in p.match.away_team.lower()]
        total = len(predictions)
        if total == 0:
            continue
        correct = sum(1 for p in predictions if p.is_correct is True)
        ranked.append((model, total, correct, round((correct / total) * 100, 2)))
    db.commit()
    ranked.sort(key=lambda item: (item[3], item[1]), reverse=True)
    ranked = ranked[:limit]
    return [{
        "rank": idx + 1, "modelId": model.id, "modelName": model.name, "username": model.owner.username if model.owner else "Unknown",
        "algorithmType": model.algorithm_type, "accuracyRate": accuracy,
        "correctPredictions": correct, "totalPredictions": total,
        "streak": correct if total and correct == total else 0,
    } for idx, (model, total, correct, accuracy) in enumerate(ranked)]

@app.post("/api/predictions/run", response_model=PredictionRead)
def run_prediction(data: PredictionRun, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    match = db.get(Match, data.matchId)
    model = db.get(PredictionModel, data.modelId)
    if not match or not model:
        raise HTTPException(404, "Match or model not found")
    if not user_can_run_model(db, user, model):
        raise HTTPException(403, "Add this marketplace model before using it for predictions")
    if match.status != "upcoming" or match.kickoff_time <= datetime.utcnow():
        raise HTTPException(400, "Predictions can only be made before the match starts")
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
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction_read(prediction)

@app.get("/api/predictions", response_model=list[PredictionRead])
def list_predictions(match_id: int | None = None, user_id: int | None = None, user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    query = db.query(Prediction)
    if match_id:
        query = query.filter(Prediction.match_id == match_id)
    if user_id:
        if user and user_id != user.id:
            raise HTTPException(403, "You can only view your own prediction history")
        query = query.filter(Prediction.user_id == user_id)
    predictions = query.order_by(Prediction.created_at.desc()).limit(100).all()
    for prediction in predictions:
        if prediction_is_rankable(prediction):
            prediction.is_correct = final_outcome(prediction.match) == prediction.predicted_outcome
    db.commit()
    return [prediction_read(p) for p in predictions]

@app.get("/api/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(league: str | None = None, team: str | None = None, country: str | None = None, db: Session = Depends(get_db)):
    query = db.query(PredictionModel)
    total = query.count()
    predictions = db.query(Prediction).join(Match).all()
    predictions = [p for p in predictions if prediction_is_rankable(p)]
    if league:
        predictions = [p for p in predictions if p.match.league and league.lower() in p.match.league.lower()]
    if team:
        predictions = [p for p in predictions if team.lower() in p.match.home_team.lower() or team.lower() in p.match.away_team.lower()]
    if country:
        predictions = [p for p in predictions if p.match.country and country.lower() in p.match.country.lower()]
    avg = 0
    if predictions:
        correct = sum(1 for p in predictions if final_outcome(p.match) == p.predicted_outcome)
        avg = (correct / len(predictions)) * 100
    return DashboardSummary(totalModels=total, averageAccuracy=float(avg))