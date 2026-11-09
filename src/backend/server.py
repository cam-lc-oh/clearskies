from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta, date, timezone
import random
import math
import time
import asyncio
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from collections import defaultdict
import uvicorn

from tenacity import (
    retry,
    stop_after_delay,
    wait_exponential,
    retry_if_exception_type,
    stop_after_attempt,
)

#Loading Env Variables
from dotenv import load_dotenv
import os
import time as time_module
import csv
import io
from fastapi.responses import StreamingResponse
from fastapi.middleware.gzip import GZipMiddleware
load_dotenv()

todaysPoints = {"count": 0, "date": date.today()} #Gloval Variable

# ----------------------------------------
# Firebase Integration for Real Time Notifications (optional)
# ----------------------------------------
import firebase_admin
from firebase_admin import credentials, firestore
import json as _json

db = None
try:
    _firebase_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
    if _firebase_json:
        cred = credentials.Certificate(_json.loads(_firebase_json))
    elif os.path.exists("firebase-credentials-new.json"):
        cred = credentials.Certificate("firebase-credentials-new.json")
    else:
        cred = None
    if cred is not None:
        firebase_admin.initialize_app(cred)
        db = firestore.client()
    else:
        print("[firebase] No credentials provided. Email subscriber features disabled.")
except Exception as _e:
    print(f"[firebase] Init failed, continuing without Firebase: {_e}")
    db = None

def get_subscriber_emails():
    if db is None:
        return []
    emails_ref = db.collection("emails")
    docs = emails_ref.stream()
    return [doc.to_dict().get("email") for doc in docs]

# ----------------------------------------
# Google Sheets sensor list (source of truth for which monitors show on the map)
# ----------------------------------------
from google.oauth2 import service_account as _service_account
from googleapiclient.discovery import build as _gbuild

_SHEETS_CACHE: Dict[str, Any] = {"data": None, "ts": 0.0}
_SHEETS_CACHE_TTL = 300  # seconds

def _load_sheets_credentials():
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if not raw:
        return None
    try:
        info = _json.loads(raw)
        return _service_account.Credentials.from_service_account_info(
            info, scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"]
        )
    except Exception as e:
        print(f"[sheets] Could not parse service account JSON: {e}")
        return None

def get_allowed_sensors() -> Dict[str, Dict[str, Optional[str]]]:
    """
    Return {sensor_id: {region, nickname}} for sensors marked Active in the sheet.
    Empty dict if sheet isn't configured (backend falls back to bbox-only behavior).
    Results cached for _SHEETS_CACHE_TTL seconds.
    """
    now = time.time()
    if _SHEETS_CACHE["data"] is not None and (now - _SHEETS_CACHE["ts"]) < _SHEETS_CACHE_TTL:
        return _SHEETS_CACHE["data"]

    sheet_id = os.getenv("SENSORS_SHEET_ID")
    if not sheet_id:
        print("[sheets] SENSORS_SHEET_ID not set. Showing all bbox sensors.")
        return {}
    creds = _load_sheets_credentials()
    if creds is None:
        print("[sheets] No service account credentials. Showing all bbox sensors.")
        return {}

    try:
        service = _gbuild("sheets", "v4", credentials=creds, cache_discovery=False)
        result = service.spreadsheets().values().get(
            spreadsheetId=sheet_id,
            range="A1:D500",
        ).execute()
        rows = result.get("values", [])
        if not rows:
            return {}
        header = [h.strip().lower() for h in rows[0]]
        # Keyed by nickname (lowercased) because simpleaq exposes the
        # human-readable name field, not the sheet's numeric ID column.
        allowed: Dict[str, Dict[str, Optional[str]]] = {}
        for row in rows[1:]:
            padded = row + [""] * (len(header) - len(row))
            entry = dict(zip(header, padded))
            if str(entry.get("active", "")).strip().upper() not in ("TRUE", "YES", "1"):
                continue
            nickname = str(entry.get("nickname", "")).strip()
            if not nickname:
                continue
            allowed[nickname.lower()] = {
                "region": (str(entry.get("region", "")).strip() or None),
                "nickname": nickname,
                "sheet_id": (str(entry.get("id", "")).strip() or None),
            }
        _SHEETS_CACHE["data"] = allowed
        _SHEETS_CACHE["ts"] = now
        print(f"[sheets] Loaded {len(allowed)} active sensors from sheet")
        return allowed
    except Exception as e:
        print(f"[sheets] Failed to fetch sheet: {e}")
        return _SHEETS_CACHE.get("data") or {}

###
def load_prev_safe_ids():
    try:
        with open("prev_safe_ids.txt", "r") as f:
            return set(f.read().splitlines())
    except:
        return set()

def save_prev_safe_ids(ids: set):
    with open("prev_safe_ids.txt", "w") as f:
        f.write("\n".join(ids))

#previously_safe_ids = load_prev_safe_ids() #Global Variable for trigger logic

# ----------------------------------------
# In-Memory Cache with TTL
# ----------------------------------------

class DataCache:
    """Simple in-memory cache with TTL."""
    def __init__(self):
        self._store: Dict[str, tuple] = {}

    def get(self, key: str, max_age: float = 300):
        if key in self._store:
            data, timestamp = self._store[key]
            return data
        return None

    def is_fresh(self, key: str, max_age: float = 300) -> bool:
        if key in self._store:
            _, timestamp = self._store[key]
            return time_module.time() - timestamp < max_age
        return False

    def set(self, key: str, data):
        self._store[key] = (data, time_module.time())

cache = DataCache()

# ----------------------------------------
# AQI Utility Functions (from aqiUtils.ts)
# Gowrish lovemen
# ----------------------------------------


# PM2.5 AQI breakpoints (US EPA, 2024 revision; 24-hour average, ug/m3).
# aqi_lo / aqi_hi make the per-category AQI range explicit so interpolation
# is correct across all categories (the old code assumed every category
# spanned 50 AQI points, which under-reported Very Unhealthy and Hazardous
# readings where the categories actually span 100 and 200 points).
AQI_BREAKPOINTS = [
    {"min": 0.0,   "max": 9.0,   "aqi_lo": 0,   "aqi_hi": 50,  "category": "Good",                           "color": "#4ade80"},
    {"min": 9.1,   "max": 35.4,  "aqi_lo": 51,  "aqi_hi": 100, "category": "Moderate",                       "color": "#facc15"},
    {"min": 35.5,  "max": 55.4,  "aqi_lo": 101, "aqi_hi": 150, "category": "Unhealthy for Sensitive Groups", "color": "#fb923c"},
    {"min": 55.5,  "max": 125.4, "aqi_lo": 151, "aqi_hi": 200, "category": "Unhealthy",                      "color": "#f87171"},
    {"min": 125.5, "max": 225.4, "aqi_lo": 201, "aqi_hi": 300, "category": "Very Unhealthy",                 "color": "#c084fc"},
    {"min": 225.5, "max": 500.4, "aqi_lo": 301, "aqi_hi": 500, "category": "Hazardous",                      "color": "#7f1d1d"},
]


DATA_VAL_DICT = {
    "pm2.5": "pm2.5_ug_m3",
    "pm10": "pm10.0_ug_m3",
    "pm4": "pm4.0_ug_m3",
    "pm1": "pm1.0_ug_m3",
    "temperature": "temperature_C",
    "humidity": "humidity_percent",
    "pressure": "pressure_hPa",
    "voc": "voc_index",
    "nox": "nox_index",
    # These SimpleAQ fields always come back empty today; left in place so
    # the frontend can request them without erroring. Remove once their
    # device catalog starts reporting molecular concentrations.
    "NO2": "NO2_concentration_ppm",
    "O3": "O3_concentration_ppm",
    "SO2": "SO2_concentration_ppm",
}


INVERSE_DATA_VAL_DICT = {v: k for k, v in DATA_VAL_DICT.items()}




# Adjust these retry parameters as you like
@retry(
    stop=stop_after_attempt(1),              # give up after 30s
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=(
        retry_if_exception_type(httpx.RequestError) |
        retry_if_exception_type(httpx.HTTPStatusError)
    ),
)




def calculate_aqi(pm25: float) -> int:
    """EPA AQI for PM2.5 using 2024 breakpoints.

    Concentration is truncated to one decimal (per 40 CFR Appendix G),
    then linearly interpolated inside the matching category.
    """
    if pm25 is None or pm25 < 0:
        return 0
    c = int(pm25 * 10) / 10.0
    for bp in AQI_BREAKPOINTS:
        if c <= bp["max"]:
            span_aqi = bp["aqi_hi"] - bp["aqi_lo"]
            span_c = bp["max"] - bp["min"]
            if span_c <= 0:
                return bp["aqi_lo"]
            return round(span_aqi / span_c * (c - bp["min"]) + bp["aqi_lo"])
    return 500


def get_aqi_category(pm25: float) -> dict:
    if pm25 is None or pm25 < 0:
        return {"category": "Good", "color": AQI_BREAKPOINTS[0]["color"]}
    for bp in AQI_BREAKPOINTS:
        if pm25 <= bp["max"]:
            return {"category": bp["category"], "color": bp["color"]}
    return {"category": "Hazardous", "color": AQI_BREAKPOINTS[-1]["color"]}


def get_health_recommendations(category: str) -> str:
    """Actionable guidance per AQI category (aligned with EPA AirNow advice)."""
    if category == "Good":
        return "Air quality is satisfactory. No restrictions on outdoor activity."
    elif category == "Moderate":
        return ("Unusually sensitive individuals should consider reducing prolonged or "
                "heavy outdoor exertion.")
    elif category == "Unhealthy for Sensitive Groups":
        return ("People with heart or lung disease, older adults, children, and teens "
                "should reduce prolonged or heavy outdoor exertion.")
    elif category == "Unhealthy":
        return ("Everyone should reduce prolonged or heavy outdoor exertion. Sensitive "
                "groups should avoid it entirely.")
    elif category == "Very Unhealthy":
        return ("Everyone should avoid prolonged or heavy outdoor exertion; sensitive "
                "groups should remain indoors and keep activity levels low.")
    elif category == "Hazardous":
        return ("Health emergency: everyone should remain indoors with windows closed "
                "and avoid all outdoor physical activity.")
    else:
        return "Air quality information is currently unavailable."


def format_pm25(pm25: float) -> str:
    return f"{pm25:.1f}"




def fetch_latest_utc_epoch(sensor_id: str) -> int:
    url = f"https://www.simpleaq.org/api/getmostrecentdevicepoint?id={sensor_id}"
    try:
        response = httpx.get(url, timeout=5.0)
        response.raise_for_status()
        data = response.json()
        if data.get("found"):
            dt = datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
            return int(dt.timestamp() * 1000)
    except Exception as e:
        print("Error fetching latest UTC epoch:", e)
    return int(datetime.now(timezone.utc).timestamp() * 1000)






# ----------------------------------------
# Pydantic Models for API Data
# ----------------------------------------


class Location(BaseModel):
    lat: float
    lng: float


class AQICategory(BaseModel):
    category: str
    color: str


class Sensor(BaseModel):
    id: str
    name: str
    location: Location
    pm25: float
    temperature: float
    humidity: float
    lastUpdated: datetime
    pressure: float
    aqi: Optional[float] = None
    aqiCategory: Optional[AQICategory] = None
    region: Optional[str] = None
    nickname: Optional[str] = None
    pm1: Optional[float] = None
    vocIndex: Optional[float] = None
    noxIndex: Optional[float] = None


class HistoricalDataPoint(BaseModel):
    timestamp: datetime
    metric: Optional[float] = None


class HourlyDataPoint(BaseModel):
    time: datetime
    metric: Optional[float] = None






# ----------------------------------------
# Global Data Store
# ----------------------------------------


DATA = {
    "sensors": [],
    "historical": {},
    "hourly": [],
    "statistics": {}
}


# ----------------------------------------
# Data Fetching and Generation Functions
# ----------------------------------------


def fetch_pm25_data() -> dict:
    # Widened to cover Central Ohio (Franklin, Delaware, Licking, Fairfield,
    # Union, Knox, Madison, Pickaway) so CAM-LC can add monitors in any of
    # those counties via the Google Sheet with no code change.
    url = (
        "https://www.simpleaq.org/api/getdata?field=pm2.5"
        "&min_lat=39.500000&max_lat=40.600000&min_lon=-83.600000&max_lon=-82.000000"
        f"&utc_epoch={int(time.time()) * 1000}"
    )
    try:
        response = httpx.get(url, timeout=10.0)
        response.raise_for_status()
        print("Fetched PM2.5 data")
        # print(url)
        return response.json()
    except Exception as e:
        print("Error fetching PM2.5 data:", str(e))
        return {}




def random_in_range(min_val: float, max_val: float) -> float:
    return random.uniform(min_val, max_val)


async def _fetch_sensor_field_async(
    client: httpx.AsyncClient,
    sensor_id: str,
    field: str,
    range_hours: int,
    timestamp_str: str,
) -> tuple:
    """Fetch a single field for a single sensor. Returns (sensor_id, field, graph_data)."""
    url = (
        f"https://www.simpleaq.org/api/getgraphdata"
        f"?id={sensor_id}&field={field}&rangehours={range_hours}&time={timestamp_str}"
    )
    try:
        resp = await client.get(url, timeout=httpx.Timeout(10.0, read=30.0))
        resp.raise_for_status()
        graph_data = resp.json().get("value", [])
    except Exception as e:
        print(f"Error fetching {field} for sensor {sensor_id}: {e}")
        graph_data = []
    return (sensor_id, field, graph_data)


async def generate_sensors_async(sensor_json: dict) -> List[Sensor]:
    """Fetch all sensor fields in parallel using httpx.AsyncClient and asyncio.gather."""
    sensors = []
    if not sensor_json:
        return sensors

    # Filter the bbox result down to the sensors CAM-LC curates in the sheet.
    # Matching: the simpleaq dict key is an internal cuid (like 'cm9ufuy...'),
    # but each entry's 'name' field matches the sheet's Nickname column
    # ('CAW25020', 'DIRTYBOX', 'Tracee', etc.), so match on name (case-
    # insensitive). If the sheet isn't configured (allowed is empty), fall
    # through to the old bbox-only behavior so nothing breaks during setup.
    allowed = get_allowed_sensors()  # keyed by nickname (lowercased)
    if allowed:
        sensor_json = {
            sid: data
            for sid, data in sensor_json.items()
            if str(data.get("name") or "").strip().lower() in allowed
        }

    fields = [
        "pm2.5_ug_m3", "pressure_hPa", "temperature_C", "humidity_percent",
        "pm1.0_ug_m3", "voc_index", "nox_index",
    ]
    timestamp_str = datetime.now().isoformat()
    range_hours = 1

    # Build all fetch tasks for all sensors and all fields
    tasks = []
    async with httpx.AsyncClient() as client:
        for sensor_id, sensor_data in sensor_json.items():
            for f in fields:
                tasks.append(
                    _fetch_sensor_field_async(client, sensor_id, f, range_hours, timestamp_str)
                )

        # Fire all requests in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)

    # Organize results by sensor_id
    # results_map[sensor_id][field] = graph_data
    results_map: Dict[str, Dict[str, list]] = defaultdict(dict)
    for result in results:
        if isinstance(result, Exception):
            print(f"Exception in parallel fetch: {result}")
            continue
        sid, field, graph_data = result
        results_map[sid][field] = graph_data

    # Build Sensor objects from the fetched data
    for sensor_id, sensor_data in sensor_json.items():
        try:
            name = sensor_data.get("name")
            latitude = sensor_data.get("latitude")
            longitude = sensor_data.get("longitude")
            value = sensor_data.get("value")
            field_data = results_map.get(sensor_id, {})

            # Extract pm2.5
            pm25_data = field_data.get("pm2.5_ug_m3", [])
            if pm25_data and len(pm25_data) > 0:
                try:
                    pm25 = float(pm25_data[-1])
                except:
                    pm25 = 0
            else:
                pm25 = float(value) if value is not None else 0

            # Extract pressure
            pressure_data = field_data.get("pressure_hPa", [])
            if pressure_data and len(pressure_data) > 0:
                try:
                    pressure = float(pressure_data[-1])
                except:
                    pressure = 0
            else:
                pressure = 0

            # Extract temperature
            temperature_data = field_data.get("temperature_C", [])
            if temperature_data and len(temperature_data) > 0:
                try:
                    temperature = float(temperature_data[-1])
                except:
                    temperature = 0
            else:
                temperature = 0

            # Extract humidity
            humidity_data = field_data.get("humidity_percent", [])
            if humidity_data and len(humidity_data) > 0:
                try:
                    humidity = float(humidity_data[-1])
                except:
                    humidity = 0
            else:
                humidity = 0

            try:
                last_updated = datetime.fromisoformat(timestamp_str)
            except Exception:
                last_updated = datetime.now()

            def _last_float(field_key: str):
                arr = field_data.get(field_key, [])
                if arr:
                    try:
                        return float(arr[-1])
                    except Exception:
                        return None
                return None

            pm1 = _last_float("pm1.0_ug_m3")
            voc_index = _last_float("voc_index")
            nox_index = _last_float("nox_index")

            allowed_meta = (
                allowed.get(str(name or "").strip().lower(), {}) if allowed else {}
            )
            sensor_obj = Sensor(
                id=sensor_id,
                name=name,
                location=Location(lat=float(latitude), lng=float(longitude)),
                pm25=pm25,
                temperature=temperature,
                humidity=humidity,
                pressure=pressure,
                lastUpdated=last_updated,
                aqi=calculate_aqi(pm25),
                aqiCategory=get_aqi_category(pm25),
                region=allowed_meta.get("region"),
                nickname=allowed_meta.get("nickname"),
                pm1=pm1,
                vocIndex=voc_index,
                noxIndex=nox_index,
            )
            sensors.append(sensor_obj)
        except Exception as e:
            print(f"Error processing sensor {sensor_data.get('name')}: {e}")
    return sensors


async def _fetch_chunk_async(
    client: httpx.AsyncClient,
    sensor_id: str,
    api_field: str,
    end_time_iso: str,
    range_hours: int,
) -> Dict[str, Any]:
    """
    Fetch one chunk of data, retrying on network or HTTP errors
    until either success or 30s total elapsed.
    """
    url = (
        f"https://www.simpleaq.org/api/getgraphdata"
        f"?id={sensor_id}"
        f"&field={api_field}"
        f"&rangehours={range_hours}"
        f"&time={end_time_iso}"
    )
    print("url: ", url)
    print("fetch attempt for:", end_time_iso)
    try:
        resp = await client.get(url, timeout=httpx.Timeout(10.0, read=60.0))
        resp.raise_for_status()
    except Exception as e:
        print("  fetch failed:", repr(e))
        raise
    data = resp.json()
    data.pop("sensor", None)
    # ensure shape
    return {
        "time": data.get("time", []),
        "value": data.get("value", []),
    }


async def generate_historical_data(
    sensor_id: str,
    api_field: str,
    time_range: str
) -> List[Dict[str, Optional[float]]]:
    if time_range == "7d":
        days_to_return = 7
    else:  # "30d" or anything else
        days_to_return = 35


    chunk_days  = 7
    chunk_hours = chunk_days * 24


    # map api_field to output key
    output_key = INVERSE_DATA_VAL_DICT.get(api_field)
    if output_key is None:
        raise ValueError(f"No matching output key for API field: {api_field}")


    # build list of chunk end-times
    now = datetime.now(timezone.utc)
    num_chunks = (days_to_return + chunk_days - 1) // chunk_days
    end_times = [
        (now - timedelta(days=i * chunk_days))
        .strftime("%Y-%m-%dT%H:%M:%S.000Z")
        for i in range(num_chunks)
    ]


    # fetch all chunks in parallel
    async with httpx.AsyncClient() as client:
        tasks = [
            _fetch_chunk_async(client, sensor_id, api_field, et, chunk_hours)
            for et in end_times
        ]
        chunks: List[Dict[str, Any]] = await asyncio.gather(*tasks)


    # aggregate: raw -> hourly buckets -> daily buckets
    daily_sum   = defaultdict(float)
    daily_count = defaultdict(int)


    for chunk in chunks:
        # first pass: bucket into hours
        hourly_sum   = defaultdict(float)
        hourly_count = defaultdict(int)


        for ts_str, val_str in zip(chunk["time"], chunk["value"]):
            try:
                dt = datetime.fromisoformat(ts_str.rstrip("Z")).replace(tzinfo=timezone.utc)
                hour_bucket = dt.replace(minute=0, second=0, microsecond=0)
                hourly_sum[hour_bucket]   += float(val_str)
                hourly_count[hour_bucket] += 1
            except Exception:
                continue


        # second pass: collapse each hourly bucket into the day's tally
        for hour_dt, total in hourly_sum.items():
            count = hourly_count[hour_dt]
            if count == 0:
                continue
            hourly_avg = total / count
            day_key = hour_dt.date()
            daily_sum[day_key]   += hourly_avg
            daily_count[day_key] += 1


    # build the final list, one entry per day (fills in missing days with None)
    result: List[Dict[str, Optional[float]]] = []
    for offset in range(days_to_return - 1, -1, -1):
        day = (now - timedelta(days=offset)).date()
        if daily_count[day]:
            day_avg = round(daily_sum[day] / daily_count[day], 4)
        else:
            day_avg = None


        ts_midnight = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
        result.append({
            "timestamp": ts_midnight.strftime("%Y-%m-%dT00:00:00"),
            output_key: day_avg
        })


    return result




def generate_24hour_data(time, field, sensor_id) -> List[HourlyDataPoint]:
    raw = transform_data_from_url(sensor_id, field, time, 24)


    # Parse timestamps and values
    records = [
        (datetime.fromisoformat(ts.rstrip("Z")).replace(tzinfo=timezone.utc), float(val))
        for ts, val in zip(raw["time"], raw["value"])
    ]

    # Group data by hour
    hourly_data = {}
    for timestamp, value in records:
        hour_key = timestamp.replace(minute=0, second=0, microsecond=0)
        if hour_key not in hourly_data:
            hourly_data[hour_key] = []
        hourly_data[hour_key].append(value)

    # Calculate hourly averages
    result = []
    metric_key = INVERSE_DATA_VAL_DICT.get(field)
    for hour in sorted(hourly_data.keys()):
        values = hourly_data[hour]
        metric_avg = sum(values) / len(values)
        aqi = calculate_aqi(metric_avg)

        data_point = {
            "time": hour.strftime("%Y-%m-%dT%H:00:00")
        }

        if metric_key:
            data_point[metric_key] = round(metric_avg, 4)


        result.append(data_point)

    return result




def transform_data_from_url(sensor_id: str, field: str, time: str, range_hours: int) -> dict:
    url = f"https://www.simpleaq.org/api/getgraphdata?id={sensor_id}&field={field}&rangehours={range_hours}&time={time}"
    timeouts = httpx.Timeout(10.0, read=60.0, write=60.0)
    try:
        response = httpx.get(url, timeout=timeouts)
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPStatusError as e:
        print(f"HTTP error for {url}: {e}")
        return {"time": [], "value": []}
    except httpx.RequestError as e:
        print(f"Request error for {url}: {e}")
        return {"time": [], "value": []}
    except Exception as e:
        print(f"An unexpected error occurred fetching {url}: {e}")
        return {"time": [], "value": []}
    data.pop("sensor", None)
    return data




def calculate_statistics(sensors: List[Sensor]) -> Dict:
    if not sensors:
        return {}
    pm25_values = [sensor.pm25 for sensor in sensors]
    average = sum(pm25_values) / len(pm25_values)
    maximum = max(pm25_values)
    minimum = min(pm25_values)
    aqi_distribution = {}
    for sensor in sensors:
        category = sensor.aqiCategory.category if sensor.aqiCategory else "Unknown"
        aqi_distribution[category] = aqi_distribution.get(category, 0) + 1
    return {
        "averagePM25": average,
        "maxPM25": maximum,
        "minPM25": minimum,
        "aqiDistribution": aqi_distribution
    }



async def refresh_data():

    global todaysPoints

    raw_data = fetch_pm25_data()
    sensors = await generate_sensors_async(raw_data)


    #Add to count to show how many datapoints were collected today
    #Reset Every Day
    if todaysPoints["count"] == date.today():
        todaysPoints["count"] += 1
        print("Count incremented:", todaysPoints["count"])
    else:
        todaysPoints["count"] = 0
        todaysPoints["date"] = date.today()



    #global previously_safe_ids
    previously_safe_ids = load_prev_safe_ids()

    UNHEALTHY_CATEGORIES = {"Unhealthy", "Very Unhealthy", "Hazardous", "Unhealthy for Sensitive Groups"}
    triggered_sensors = []

    #Detect new unhealthy sensors
    for sensor in sensors:
        if sensor.aqiCategory and sensor.aqiCategory.category in UNHEALTHY_CATEGORIES:
            if sensor.id in previously_safe_ids:
               triggered_sensors.append(sensor)

    if triggered_sensors:
        # Send to PipeDream (use async httpx client for the notification)
        async with httpx.AsyncClient() as notify_client:
            await notify_client.post(os.getenv("VITE_PIPEDREAM_REALTIME"), json={
                "sensors": [
                    {"name": s.name, "aqi": s.aqi, "category": s.aqiCategory.category}
                    for s in triggered_sensors
                    ]
            })
        print(f"Triggered {len(triggered_sensors)} sensors!")
        for s in triggered_sensors:
            print(f"  -> {s.name} is now {s.aqiCategory.category}")

    # Update previously_safe_ids for next check
    new_safe_ids = {
        sensor.id
        for sensor in sensors
        if sensor.aqiCategory and sensor.aqiCategory.category not in UNHEALTHY_CATEGORIES
    }
    save_prev_safe_ids(new_safe_ids)




    # Only generate hourly data for the first available sensor
    if sensors:
        default_sensor_id = sensors[0].id
        hourly = generate_24hour_data(datetime.now().isoformat(), "pm2.5_ug_m3", default_sensor_id)
    else:
        hourly = []

    stats = calculate_statistics(sensors)

    DATA["sensors"] = sensors
    DATA["hourly"] = hourly
    DATA["statistics"] = stats
    print("Data refreshed", datetime.now().isoformat())



# ----------------------------------------
# FastAPI App Setup
# ----------------------------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict this to your frontend URL(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=500)

scheduler = AsyncIOScheduler()
scheduler.add_job(refresh_data, 'interval', minutes=10)


@app.on_event("startup")
async def startup_event():
    """Load initial data and start the scheduler on server startup."""
    await refresh_data()
    scheduler.start()


@app.get("/health")
def health():
    return {"status": "ok", "sensors": len(DATA["sensors"]), "timestamp": datetime.now().isoformat()}


@app.get("/api/sensors", response_model=List[Sensor])
def get_sensors():
    return DATA["sensors"]

@app.get("/api/refreshtable")
async def refresh_table():
    await refresh_data()
    return DATA["sensors"]



@app.get("/api/historical")
async def get_historical(
    sensor_id: Optional[str] = Query(None),
    metric:    Optional[str] = Query(None),
    time_range: Optional[str] = Query(None),
):
    if not sensor_id:
        if not DATA["sensors"]:
            return []
        sensor_id = DATA["sensors"][0].id
    if not metric:
        metric = "pm2.5"
    backend_field = DATA_VAL_DICT.get(metric)
    if backend_field is None:
        return []

    cache_key = f"historical:{sensor_id}:{backend_field}:{time_range}"
    cached = cache.get(cache_key, max_age=600)
    if cached is not None:
        if not cache.is_fresh(cache_key, max_age=600):
            asyncio.create_task(_refresh_historical_cache(cache_key, sensor_id, backend_field, time_range))
        return cached

    result = await generate_historical_data(sensor_id, backend_field, time_range)
    cache.set(cache_key, result)
    return result

async def _refresh_historical_cache(cache_key, sensor_id, backend_field, time_range):
    try:
        result = await generate_historical_data(sensor_id, backend_field, time_range)
        cache.set(cache_key, result)
    except Exception as e:
        print(f"Background cache refresh failed: {e}")




@app.get("/api/hourly")
def get_hourly(sensor_id: Optional[str] = Query(None), metric: Optional[str] = Query(None)):
    now = datetime.now().isoformat()

    if not sensor_id:
        if not DATA["sensors"]:
            return []
        sensor_id = DATA["sensors"][0].id
    if not metric:
        metric = "pm2.5"


    backend_field = DATA_VAL_DICT.get(metric)
    if backend_field is None:
        print(f"[WARNING] Unknown metric: {metric}")
        return []

    print(f"[INFO] Fetching {metric} ({backend_field}) for sensor {sensor_id}")
    return generate_24hour_data(now, backend_field, sensor_id)




@app.get("/api/statistics")
def get_statistics():
    return DATA["statistics"]


#Global Counter Variable For Data Points / Day
@app.get("/api/counter")
def get_count():
    return {"count": todaysPoints["count"],  "date": todaysPoints["date"]}



# ----------------------------------------
# New Endpoints: Breathability, Streak, Compare, Export, Network Health
# ----------------------------------------

@app.get("/api/breathability")
def get_breathability():
    if not DATA["sensors"]:
        return {"score": 0, "label": "No data", "description": "No sensors available"}
    sensors = DATA["sensors"]
    avg_pm25 = sum(s.pm25 for s in sensors) / len(sensors)
    avg_humidity = sum(s.humidity for s in sensors) / len(sensors)
    avg_temp = sum(s.temperature for s in sensors) / len(sensors)

    pm25_score = max(0, 100 - (avg_pm25 / 50) * 100)
    temp_ideal = 21
    temp_score = max(0, 100 - abs(avg_temp - temp_ideal) * 5)
    humidity_score = max(0, 100 - abs(avg_humidity - 45) * 2)

    score = round(pm25_score * 0.6 + temp_score * 0.2 + humidity_score * 0.2)
    score = max(0, min(100, score))

    if score >= 80: label, desc = "Excellent", "Perfect conditions for outdoor activities"
    elif score >= 60: label, desc = "Good", "Great day to be outside"
    elif score >= 40: label, desc = "Fair", "Consider limiting prolonged outdoor exertion"
    elif score >= 20: label, desc = "Poor", "Sensitive groups should stay indoors"
    else: label, desc = "Very Poor", "Everyone should limit outdoor exposure"

    return {"score": score, "label": label, "description": desc,
            "components": {"pm25": round(pm25_score), "temperature": round(temp_score), "humidity": round(humidity_score)}}


@app.get("/api/streak")
async def get_streak():
    if not DATA["sensors"]:
        return {"days": 0, "active": False}
    sensor_id = DATA["sensors"][0].id
    cache_key = f"historical:{sensor_id}:pm2.5_ug_m3:30d"
    history = cache.get(cache_key)
    if history is None:
        try:
            history = await generate_historical_data(sensor_id, "pm2.5_ug_m3", "30d")
            cache.set(cache_key, history)
        except:
            return {"days": 0, "active": False}

    streak = 0
    for day in reversed(history):
        pm25_val = day.get("pm2.5")
        if pm25_val is not None and pm25_val <= 12:
            streak += 1
        else:
            break
    return {"days": streak, "active": streak > 0}


@app.get("/api/compare")
async def compare_sensors(
    sensors: str = Query(..., description="Comma-separated sensor IDs"),
    metric: str = Query("pm2.5"),
    time_range: str = Query("24h"),
):
    sensor_ids = [s.strip() for s in sensors.split(",")]
    backend_field = DATA_VAL_DICT.get(metric, "pm2.5_ug_m3")
    results = {}
    if time_range == "24h":
        for sid in sensor_ids:
            data = generate_24hour_data(datetime.now().isoformat(), backend_field, sid)
            sensor_name = next((s.name for s in DATA["sensors"] if s.id == sid), sid)
            results[sensor_name] = data
    else:
        tasks = [generate_historical_data(sid, backend_field, time_range) for sid in sensor_ids]
        fetched = await asyncio.gather(*tasks, return_exceptions=True)
        for sid, data in zip(sensor_ids, fetched):
            if isinstance(data, Exception):
                continue
            sensor_name = next((s.name for s in DATA["sensors"] if s.id == sid), sid)
            results[sensor_name] = data
    return results


@app.get("/api/export")
async def export_data(
    format: str = Query("csv"),
    sensor_id: Optional[str] = Query(None),
    time_range: str = Query("7d"),
):
    if not sensor_id and DATA["sensors"]:
        sensor_id = DATA["sensors"][0].id
    if not sensor_id:
        return {"error": "No sensors available"}

    data = await generate_historical_data(sensor_id, "pm2.5_ug_m3", time_range)

    if format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["timestamp", "pm2.5"])
        writer.writeheader()
        for row in data:
            writer.writerow(row)
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=clearskies_{time_range}.csv"}
        )
    return data


@app.get("/api/network-health")
def get_network_health():
    if not DATA["sensors"]:
        return {"sensors": [], "overall_health": 0}

    now = datetime.now()
    sensor_health = []
    for s in DATA["sensors"]:
        last = s.lastUpdated
        minutes_ago = (now - last).total_seconds() / 60 if last else 999

        if minutes_ago < 30: status = "online"
        elif minutes_ago < 120: status = "delayed"
        else: status = "offline"

        quality = 100
        if s.pm25 == 0: quality -= 25
        if s.temperature == 0: quality -= 25
        if s.humidity == 0: quality -= 25
        if s.pressure == 0: quality -= 25

        sensor_health.append({
            "id": s.id, "name": s.name, "status": status,
            "minutes_since_update": round(minutes_ago),
            "data_quality": max(0, quality),
            "location": {"lat": s.location.lat, "lng": s.location.lng}
        })

    online = sum(1 for s in sensor_health if s["status"] == "online")
    overall = round((online / len(sensor_health)) * 100) if sensor_health else 0
    return {"sensors": sensor_health, "overall_health": overall, "total": len(sensor_health), "online": online}


# ----------------------------------------
# Run the Server (Uvicorn)
# ----------------------------------------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3001)
