import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
import httpx
from sqlalchemy.orm import Session
from .models import Match

load_dotenv()
BASE_URL = "https://v3.football.api-sports.io"
LIVE = {"1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT"}
DONE = {"FT", "AET", "PEN", "AWD", "WO"}

def map_status(short: str) -> str:
    if short in LIVE:
        return "live"
    if short in DONE:
        return "finished"
    return "upcoming"

def parse_dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)

def get_stat(stats, team_id: int, stat_type: str) -> int | None:
    if not stats:
        return None
    team_stats = next((entry for entry in stats if entry.get("team", {}).get("id") == team_id), None)
    if not team_stats:
        return None
    stat = next((entry for entry in team_stats.get("statistics", []) if entry.get("type") == stat_type), None)
    if not stat or stat.get("value") is None:
        return None
    value = stat["value"]
    if isinstance(value, str):
        value = value.replace("%", "")
    try:
        return int(value)
    except (TypeError, ValueError):
        return None

def odds_from_names(home: str, away: str) -> tuple[float, float, float]:
    score = lambda s: sum(ord(c) for c in s)
    diff = (score(home) % 30) - (score(away) % 30)
    home_odds = max(1.55, min(4.8, 2.35 - diff / 45))
    away_odds = max(1.65, min(5.2, 2.55 + diff / 45))
    draw_odds = 3.1 + abs(diff) / 80
    return round(home_odds, 2), round(draw_odds, 2), round(away_odds, 2)

def to_match_payload(raw: dict) -> dict:
    fixture = raw["fixture"]
    league = raw["league"]
    teams = raw["teams"]
    goals = raw.get("goals") or {}
    home_id = teams["home"]["id"]
    away_id = teams["away"]["id"]
    venue = fixture.get("venue") or {}
    venue_name = venue.get("name")
    venue_city = venue.get("city")
    full_venue = f"{venue_name}, {venue_city}" if venue_name and venue_city else venue_name or venue_city
    home_odds, draw_odds, away_odds = odds_from_names(teams["home"]["name"], teams["away"]["name"])
    short = fixture["status"]["short"]
    stats = raw.get("statistics")
    return {
        "external_id": str(fixture["id"]),
        "home_team": teams["home"]["name"],
        "away_team": teams["away"]["name"],
        "home_team_logo": teams["home"].get("logo"),
        "away_team_logo": teams["away"].get("logo"),
        "league": league["name"],
        "league_id": league.get("id"),
        "season": league.get("season"),
        "country": league.get("country"),
        "kickoff_time": parse_dt(fixture["date"]),
        "status": map_status(short),
        "status_short": short,
        "minute": fixture["status"].get("elapsed"),
        "home_score": goals.get("home"),
        "away_score": goals.get("away"),
        "venue": full_venue,
        "home_possession": get_stat(stats, home_id, "Ball Possession"),
        "away_possession": get_stat(stats, away_id, "Ball Possession"),
        "home_shots": get_stat(stats, home_id, "Total Shots"),
        "away_shots": get_stat(stats, away_id, "Total Shots"),
        "home_shots_on_target": get_stat(stats, home_id, "Shots on Goal"),
        "away_shots_on_target": get_stat(stats, away_id, "Shots on Goal"),
        "home_corners": get_stat(stats, home_id, "Corner Kicks"),
        "away_corners": get_stat(stats, away_id, "Corner Kicks"),
        "home_odds": home_odds,
        "draw_odds": draw_odds,
        "away_odds": away_odds,
    }

async def fetch_football(endpoint: str) -> list[dict]:
    key = os.getenv("API_FOOTBALL_KEY")
    if not key:
        return []
    headers = {
        "x-apisports-key": key,
        "x-rapidapi-key": key,
        "x-rapidapi-host": "v3.football.api-sports.io",
    }
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(f"{BASE_URL}{endpoint}", headers=headers)
        response.raise_for_status()
        data = response.json()
        errors = data.get("errors")
        if errors:
            if isinstance(errors, dict) and errors:
                raise RuntimeError(" ".join(str(v) for v in errors.values()))
            if isinstance(errors, list) and errors:
                raise RuntimeError(" ".join(map(str, errors)))
        return data.get("response") or []

def upsert_fixtures(db: Session, fixtures: list[dict]) -> dict:
    synced = 0
    updated = 0
    for raw in fixtures:
        payload = to_match_payload(raw)
        match = db.query(Match).filter(Match.external_id == payload["external_id"]).first()
        if match:
            for key, value in payload.items():
                setattr(match, key, value)
            updated += 1
        else:
            db.add(Match(**payload))
            synced += 1
    db.commit()
    return {"synced": synced, "updated": updated}

async def sync_matches(db: Session) -> dict:
    endpoints = ["/fixtures?live=all"]
    today = datetime.utcnow().date()
    endpoints.extend(f"/fixtures?date={(today + timedelta(days=i)).isoformat()}" for i in range(5))
    all_fixtures: list[dict] = []
    for endpoint in endpoints:
        try:
            all_fixtures.extend(await fetch_football(endpoint))
        except Exception:
            continue
    seen = set()
    unique = []
    for fixture in all_fixtures:
        fid = fixture.get("fixture", {}).get("id")
        if fid and fid not in seen:
            seen.add(fid)
            unique.append(fixture)
    if not unique:
        return {"synced": 0, "updated": 0}
    return upsert_fixtures(db, unique)
