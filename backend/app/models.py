from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    favorite_league: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    models = relationship("PredictionModel", back_populates="owner", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")

class Match(Base):
    __tablename__ = "matches"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    external_id: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    home_team: Mapped[str] = mapped_column(String(180), index=True)
    away_team: Mapped[str] = mapped_column(String(180), index=True)
    home_team_logo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    away_team_logo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    league: Mapped[str] = mapped_column(String(180), index=True)
    league_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    season: Mapped[int | None] = mapped_column(Integer, nullable=True)
    country: Mapped[str | None] = mapped_column(String(120), index=True, nullable=True)
    kickoff_time: Mapped[datetime] = mapped_column(DateTime, index=True)
    status: Mapped[str] = mapped_column(String(30), index=True)
    status_short: Mapped[str] = mapped_column(String(20))
    minute: Mapped[int | None] = mapped_column(Integer, nullable=True)
    home_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    away_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    venue: Mapped[str | None] = mapped_column(String(255), nullable=True)
    home_possession: Mapped[int | None] = mapped_column(Integer, nullable=True)
    away_possession: Mapped[int | None] = mapped_column(Integer, nullable=True)
    home_shots: Mapped[int | None] = mapped_column(Integer, nullable=True)
    away_shots: Mapped[int | None] = mapped_column(Integer, nullable=True)
    home_shots_on_target: Mapped[int | None] = mapped_column(Integer, nullable=True)
    away_shots_on_target: Mapped[int | None] = mapped_column(Integer, nullable=True)
    home_corners: Mapped[int | None] = mapped_column(Integer, nullable=True)
    away_corners: Mapped[int | None] = mapped_column(Integer, nullable=True)
    home_odds: Mapped[float | None] = mapped_column(Float, nullable=True)
    draw_odds: Mapped[float | None] = mapped_column(Float, nullable=True)
    away_odds: Mapped[float | None] = mapped_column(Float, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    predictions = relationship("Prediction", back_populates="match", cascade="all, delete-orphan")

class PredictionModel(Base):
    __tablename__ = "prediction_models"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    algorithm_type: Mapped[str] = mapped_column(String(40), index=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    is_for_sale: Mapped[bool] = mapped_column(Boolean, default=False)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)
    accuracy_rate: Mapped[float] = mapped_column(Float, default=0)
    correct_predictions: Mapped[int] = mapped_column(Integer, default=0)
    total_predictions: Mapped[int] = mapped_column(Integer, default=0)
    weight_team_form: Mapped[int] = mapped_column(Integer, default=50)
    weight_home_advantage: Mapped[int] = mapped_column(Integer, default=50)
    weight_injuries: Mapped[int] = mapped_column(Integer, default=50)
    weight_head_to_head: Mapped[int] = mapped_column(Integer, default=50)
    weight_player_strength: Mapped[int] = mapped_column(Integer, default=50)
    weight_market_odds: Mapped[int] = mapped_column(Integer, default=50)
    weight_recent_form: Mapped[int] = mapped_column(Integer, default=50)
    weight_weather: Mapped[int] = mapped_column(Integer, default=50)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    owner = relationship("User", back_populates="models")
    predictions = relationship("Prediction", back_populates="model", cascade="all, delete-orphan")
    acquisitions = relationship("AcquiredModel", back_populates="model", cascade="all, delete-orphan")

class Prediction(Base):
    __tablename__ = "predictions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    model_id: Mapped[int] = mapped_column(ForeignKey("prediction_models.id"), index=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    predicted_outcome: Mapped[str] = mapped_column(String(30))
    confidence: Mapped[int] = mapped_column(Integer)
    placeholder_probability: Mapped[int] = mapped_column(Integer)
    is_placeholder: Mapped[bool] = mapped_column(Boolean, default=True)
    disclaimer: Mapped[str] = mapped_column(String(120), default="Prediction is a placeholder")
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="predictions")
    model = relationship("PredictionModel", back_populates="predictions")
    match = relationship("Match", back_populates="predictions")

class SavedMatch(Base):
    __tablename__ = "saved_matches"
    __table_args__ = (UniqueConstraint("user_id", "match_id", name="uq_user_saved_match"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class AcquiredModel(Base):
    __tablename__ = "acquired_models"
    __table_args__ = (UniqueConstraint("user_id", "model_id", name="uq_user_acquired_model"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    model_id: Mapped[int] = mapped_column(ForeignKey("prediction_models.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    model = relationship("PredictionModel", back_populates="acquisitions")