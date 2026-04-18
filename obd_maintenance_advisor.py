"""
Next maintenance only: uses brand_reliability_lookup.csv and odometer/service history
to pick the one maintenance item to do next (most overdue, else soonest due).

Aligned with EZ Car Maintenance requirements doc (Team 12, CS 3354 Spring 2026), scope:
REQ-07 (service due from mileage recommendations), REQ-08 (~500 mi reminder window on
the mileage side), REQ-09 / UI-04 / UI-06 (urgency for dashboard: overdue / due soon / current),
REQ-01 vehicle profile: mileage, make, model, model year (stored on ServiceContext). Time-based
REQ-08 (2 weeks) needs service dates from the full app; not represented here.

All distances are in miles. No OBD fault logic. Does not load obd_maintenance_metrics_catalog.csv.

NHTSA vPIC-style decode (VINData.csv): REQ-02-style Make, Model, Model Year fill the profile and
drive vehicle_age_years for service_factor. Mileage intervals stay DEFAULT_BASE_INTERVALS_MILES
until the backend stores true OEM / REQ-07 schedule data (NHTSA decode does not ship interval
tables in this CSV shape).
"""

from __future__ import annotations

import csv
import datetime
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Literal

# REQ-08: push when service is within ~500 miles (or 2 weeks in full system)
REMINDER_WITHIN_MILES = 500

MileageUrgency = Literal["overdue", "due_soon", "current"]


# --- Data you pass in / get back -------------------------------------------------

@dataclass
class ServiceContext:
    """REQ-01: current mileage, make, model, model year, plus last-service mileage map."""

    odometer_miles: float
    vehicle_age_years: float = 5.0
    vehicle_make: str | None = None
    vehicle_model: str | None = None
    model_year: int | None = None
    last_service_miles: dict[str, float | None] = field(default_factory=dict)


@dataclass
class NextMaintenance:
    """One chosen item for REQ-09-style 'next service'; urgency matches UI-06 banding."""

    service_id: str
    label: str
    last_service_miles: float
    effective_interval_miles: float
    next_due_at_miles: float
    remaining_miles: float
    urgency: MileageUrgency
    service_factor: float
    brand_reliability_index: float
    matched_brand_key: str

    def summary(self) -> str:
        """Human-readable overdue or upcoming line for UI or logs."""
        if self.remaining_miles < 0:
            return (
                f"{self.label}: overdue by ~{abs(self.remaining_miles):.0f} mi "
                f"(due by ~{self.next_due_at_miles:.0f} mi odometer)."
            )
        return (
            f"{self.label}: next due by ~{self.next_due_at_miles:.0f} mi odometer "
            f"(~{self.remaining_miles:.0f} mi remaining)."
        )


def mileage_urgency(
    remaining_miles: float, *, within_miles: float = REMINDER_WITHIN_MILES
) -> MileageUrgency:
    """REQ-08 window for due_soon; overdue if past due odometer; else current (UI-06)."""
    if remaining_miles < 0:
        return "overdue"
    if remaining_miles <= within_miles:
        return "due_soon"
    return "current"


# --- Paths and CSV ---------------------------------------------------------------

def _project_dir() -> Path:
    """Folder where this file and brand_reliability_lookup.csv live."""
    return Path(__file__).resolve().parent


def load_brand_rows(path: Path | None = None) -> list[dict[str, str]]:
    """Read brand CSV into dict rows (brand_key, aliases, reliability_index, tier)."""
    p = path or _project_dir() / "brand_reliability_lookup.csv"
    with p.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_nhtsa_vin_csv(path: Path | None = None) -> dict[str, str]:
    """
    Parse NHTSA vPIC-style flat CSV (columns variableid, variable, valueid, value).
    Last row wins if the same variable appears twice. Values are stripped strings.
    """
    p = path or _project_dir() / "VINData.csv"
    out: dict[str, str] = {}
    with p.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            var = (row.get("variable") or "").strip()
            if not var:
                continue
            val = (row.get("value") or "").strip()
            out[var] = val
    return out


def nhtsa_error_code(decode: dict[str, str]) -> str | None:
    """Return Error Code value if present (e.g. incomplete VIN); None if blank."""
    raw = decode.get("Error Code")
    if raw is None or str(raw).strip() == "":
        return None
    return str(raw).strip()


def _parse_model_year_from_decode(decode: dict[str, str]) -> int | None:
    """NHTSA variable 'Model Year' -> int year, or None if missing/invalid."""
    raw = decode.get("Model Year") or ""
    s = str(raw).strip()
    if not s.isdigit():
        return None
    y = int(s)
    if 1900 <= y <= 2100:
        return y
    return None


def _strip_optional(s: str | None) -> str | None:
    if s is None:
        return None
    t = str(s).strip()
    return t or None


def service_context_from_nhtsa_decode(
    decode: dict[str, str],
    *,
    odometer_miles: float,
    last_service_miles: dict[str, float | None],
    reference_year: int | None = None,
) -> ServiceContext:
    """
    REQ-02: fill REQ-01 fields from NHTSA variables Make, Model, Model Year.
    vehicle_age_years = reference_year - model_year (min 0); if Model Year missing, age stays 5.0.
    """
    ref = int(reference_year or datetime.date.today().year)
    make = _strip_optional(decode.get("Make"))
    model = _strip_optional(decode.get("Model"))
    my = _parse_model_year_from_decode(decode)
    age = 5.0
    if my is not None:
        age = max(0.0, float(ref - my))
    return ServiceContext(
        odometer_miles=odometer_miles,
        vehicle_age_years=age,
        vehicle_make=make,
        vehicle_model=model,
        model_year=my,
        last_service_miles=dict(last_service_miles),
    )


def service_context_from_vin_csv(
    *,
    vin_csv: Path | None = None,
    odometer_miles: float,
    last_service_miles: dict[str, float | None],
    reference_year: int | None = None,
) -> ServiceContext:
    """Load VINData.csv (or path) and build ServiceContext via service_context_from_nhtsa_decode."""
    decode = load_nhtsa_vin_csv(vin_csv)
    return service_context_from_nhtsa_decode(
        decode,
        odometer_miles=odometer_miles,
        last_service_miles=last_service_miles,
        reference_year=reference_year,
    )


def lookup_brand_reliability(
    make: str | None, rows: list[dict[str, str]]
) -> tuple[float, str, str]:
    """Match make string to a row; return (reliability_index, tier, brand_key)."""
    generic = (0.75, "B", "generic_unknown")
    by_key: dict[str, dict[str, str]] = {r["brand_key"]: r for r in rows}
    if "generic_unknown" in by_key:
        g = by_key["generic_unknown"]
        generic = (float(g["reliability_index"]), g["reliability_tier"], "generic_unknown")
    if not make or not str(make).strip():
        return generic
    n = str(make).strip().lower()
    for r in rows:
        if r["brand_key"].lower() == n:
            return float(r["reliability_index"]), r["reliability_tier"], r["brand_key"]
        for part in (r.get("aliases") or "").split(";"):
            if part.strip().lower() == n:
                return float(r["reliability_index"]), r["reliability_tier"], r["brand_key"]
    return generic


# --- Interval math ---------------------------------------------------------------

def compute_service_factor(
    vehicle_age_years: float,
    reliability_index: float,
    k_age: float = 0.04,
    cap_low: float = 0.5,
    cap_high: float = 2.0,
) -> float:
    """Higher factor => shorter recommended intervals (older car / lower reliability)."""
    ri = max(reliability_index, 0.35)
    sf = (1.0 + max(vehicle_age_years, 0.0) * k_age) / ri
    return max(cap_low, min(cap_high, sf))


# REQ-07 mileage placeholders until Mongo/backend stores OEM intervals (REQ-02 decode has no
# interval table in VINData.csv). Oil 5000 mi matches glossary §1.3 example; others are US anchors.
DEFAULT_BASE_INTERVALS_MILES: dict[str, float] = {
    "engine_oil_and_filter": 5000.0,
    "engine_air_filter": 15000.0,
    "cabin_air_filter": 12000.0,
    "spark_plugs": 30000.0,
    "transmission_fluid": 30000.0,
    "coolant_service": 50000.0,
    "brake_fluid": 20000.0,
}

# Tie-break when two items share the same urgency (lower = preferred first)
_SERVICE_ORDER: dict[str, int] = {
    "engine_oil_and_filter": 0,
    "engine_air_filter": 1,
    "cabin_air_filter": 2,
    "spark_plugs": 3,
    "brake_fluid": 4,
    "transmission_fluid": 5,
    "coolant_service": 6,
}

# Floor so scaled intervals do not go unrealistically short (not specified in REQ doc)
_MIN_INTERVAL_MILES = 1000.0


def effective_interval_miles(base_miles: float, service_factor: float) -> float:
    """Scale baseline interval down when service_factor is high."""
    sf = max(service_factor, 0.5)
    return max(float(_MIN_INTERVAL_MILES), base_miles / sf)


def _service_label(service_id: str) -> str:
    """Turn snake_case id into Title Case for display."""
    return service_id.replace("_", " ").title()


# --- Main API ------------------------------------------------------------------

def next_maintenance(
    ctx: ServiceContext,
    *,
    brand_csv: Path | None = None,
    k_age: float = 0.04,
    base_intervals_miles: dict[str, float] | None = None,
) -> NextMaintenance | None:
    """REQ-07 next due by mileage; REQ-09 ordering; None if no last_service_miles entries."""
    brands = load_brand_rows(brand_csv)
    ri, _tier, matched = lookup_brand_reliability(
        str(ctx.vehicle_make) if ctx.vehicle_make else None, brands
    )
    sf = compute_service_factor(ctx.vehicle_age_years, ri, k_age=k_age)
    bases = base_intervals_miles or DEFAULT_BASE_INTERVALS_MILES
    odo = ctx.odometer_miles
    history = ctx.last_service_miles or {}

    # (service_id, last_mi, interval_mi, next_due_mi, remaining_mi)
    rows: list[tuple[str, float, float, float, float]] = []
    for sid, base in bases.items():
        last = history.get(sid)
        if last is None:
            continue
        try:
            last_f = float(last)
        except (TypeError, ValueError):
            continue
        if last_f > odo:
            continue
        interval = effective_interval_miles(base, sf)
        next_at = last_f + interval
        remaining = next_at - odo
        rows.append((sid, last_f, interval, next_at, remaining))

    if not rows:
        return None

    overdue = [r for r in rows if r[4] < 0]
    pool = overdue if overdue else rows

    # Urgency first (most overdue / soonest), then _SERVICE_ORDER for ties
    def sort_key(r: tuple[str, float, float, float, float]) -> tuple[float, int]:
        """Return (remaining_miles, priority) for min() comparison."""
        sid, _l, _i, _n, rem = r
        if overdue:
            return (rem, _SERVICE_ORDER.get(sid, 99))
        return (rem, _SERVICE_ORDER.get(sid, 99))

    sid, last_f, interval, next_at, remaining = min(pool, key=sort_key)
    urg = mileage_urgency(remaining)

    return NextMaintenance(
        service_id=sid,
        label=_service_label(sid),
        last_service_miles=last_f,
        effective_interval_miles=interval,
        next_due_at_miles=next_at,
        remaining_miles=remaining,
        urgency=urg,
        service_factor=sf,
        brand_reliability_index=ri,
        matched_brand_key=matched,
    )


def next_maintenance_to_dict(n: NextMaintenance | None) -> dict[str, Any] | None:
    """Serialize result for JSON; adds summary string. None in => None out."""
    if n is None:
        return None
    d = asdict(n)
    d["summary"] = n.summary()
    return d


def next_maintenance_from_vin_csv(
    *,
    vin_csv: Path | None = None,
    odometer_miles: float,
    last_service_miles: dict[str, float | None],
    brand_csv: Path | None = None,
    k_age: float = 0.04,
    base_intervals_miles: dict[str, float] | None = None,
    reference_year: int | None = None,
) -> NextMaintenance | None:
    """Convenience: NHTSA VIN CSV + history -> ServiceContext -> next_maintenance."""
    ctx = service_context_from_vin_csv(
        vin_csv=vin_csv,
        odometer_miles=odometer_miles,
        last_service_miles=last_service_miles,
        reference_year=reference_year,
    )
    return next_maintenance(
        ctx,
        brand_csv=brand_csv,
        k_age=k_age,
        base_intervals_miles=base_intervals_miles,
    )


# --- Runnable examples (tiers A/B/C from brand_reliability_lookup.csv) ------------

if __name__ == "__main__":
    examples: list[tuple[str, ServiceContext]] = [
        (
            "Tier A (Honda)",
            ServiceContext(
                odometer_miles=58_200,
                vehicle_age_years=4,
                vehicle_make="Honda",
                last_service_miles={
                    "engine_oil_and_filter": 52_800,
                    "engine_air_filter": 45_000,
                    "spark_plugs": 40_000,
                },
            ),
        ),
        (
            "Tier B (Chevrolet)",
            ServiceContext(
                odometer_miles=41_800,
                vehicle_age_years=7,
                vehicle_make="Chevrolet",
                last_service_miles={
                    "engine_oil_and_filter": 37_500,
                    "engine_air_filter": 30_000,
                    "cabin_air_filter": 28_000,
                },
            ),
        ),
        (
            "Tier C (Jeep)",
            ServiceContext(
                odometer_miles=64_312,
                vehicle_age_years=9,
                vehicle_make="Jeep",
                last_service_miles={
                    "engine_oil_and_filter": 59_030,
                    "engine_air_filter": 43_496,
                    "spark_plugs": 34_175,
                },
            ),
        ),
    ]

    brand_rows = load_brand_rows()
    tier_for = {r["brand_key"]: r["reliability_tier"] for r in brand_rows}

    # NHTSA-style VINData.csv (Make / Model Year drive brand + age)
    vin_decode = load_nhtsa_vin_csv()
    print("\n=== From NHTSA VINData.csv (sample decode) ===")
    print(
        "Make:",
        vin_decode.get("Make"),
        "| Model:",
        vin_decode.get("Model"),
        "| Model Year:",
        vin_decode.get("Model Year"),
    )
    ec = nhtsa_error_code(vin_decode)
    if ec:
        print("NHTSA Error Code:", ec, "|", vin_decode.get("Error Text", ""))
    ctx_vin = service_context_from_nhtsa_decode(
        vin_decode,
        odometer_miles=95_000,
        last_service_miles={
            "engine_oil_and_filter": 88_000,
            "engine_air_filter": 82_000,
        },
        reference_year=2026,
    )
    n_vin = next_maintenance(ctx_vin)
    if n_vin:
        print(
            "profile:",
            ctx_vin.vehicle_make,
            ctx_vin.vehicle_model,
            ctx_vin.model_year,
            "| derived age (yr):",
            round(ctx_vin.vehicle_age_years, 1),
            "| CSV tier:",
            tier_for.get(n_vin.matched_brand_key, "?"),
            "| urgency:",
            n_vin.urgency,
        )
        print(n_vin.summary())
    else:
        print("No next maintenance for VIN-driven context.")

    for title, demo in examples:
        print(f"\n=== {title} ===")
        n = next_maintenance(demo)
        if n is None:
            print("No next maintenance: add last_service_miles for at least one service type.")
        else:
            print(
                "CSV tier:",
                tier_for.get(n.matched_brand_key, "?"),
                "| urgency:",
                n.urgency,
                "| service_factor:",
                round(n.service_factor, 3),
                "| brand:",
                n.matched_brand_key,
            )
            print(n.summary())
