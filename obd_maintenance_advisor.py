"""
Next maintenance only: uses brand_reliability_lookup.csv and odometer/service history
to pick the one maintenance item to do next (most overdue, else soonest due).

All distances are in miles (odometer and intervals).

No OBD fault logic. Does not load obd_maintenance_metrics_catalog.csv.
"""

from __future__ import annotations

import csv
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any


# --- Data you pass in / get back -------------------------------------------------

@dataclass
class ServiceContext:
    """Current odometer, vehicle age/make, and last service mileage per service type."""

    odometer_miles: float
    vehicle_age_years: float = 5.0
    vehicle_make: str | None = None
    last_service_miles: dict[str, float | None] = field(default_factory=dict)


@dataclass
class NextMaintenance:
    """One chosen maintenance item: due math plus brand/factor metadata."""

    service_id: str
    label: str
    last_service_miles: float
    effective_interval_miles: float
    next_due_at_miles: float
    remaining_miles: float
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


# --- Paths and CSV ---------------------------------------------------------------

def _project_dir() -> Path:
    """Folder where this file and brand_reliability_lookup.csv live."""
    return Path(__file__).resolve().parent


def load_brand_rows(path: Path | None = None) -> list[dict[str, str]]:
    """Read brand CSV into dict rows (brand_key, aliases, reliability_index, tier)."""
    p = path or _project_dir() / "brand_reliability_lookup.csv"
    with p.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


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


# Baseline miles at service_factor 1.0 (converted from prior ~km baselines); tune per OEM
_DEFAULT_KM_BASES = {
    "engine_oil_and_filter": 10_000.0,
    "engine_air_filter": 24_000.0,
    "cabin_air_filter": 16_000.0,
    "spark_plugs": 48_000.0,
    "transmission_fluid": 60_000.0,
    "coolant_service": 80_000.0,
    "brake_fluid": 40_000.0,
}
_KM_TO_MI = 0.621371
DEFAULT_BASE_INTERVALS_MILES: dict[str, float] = {
    k: round(v * _KM_TO_MI) for k, v in _DEFAULT_KM_BASES.items()
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

# Minimum effective interval (mi); ~1000 km converted
_MIN_INTERVAL_MILES = round(1000.0 * _KM_TO_MI)


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
    """Pick one item: most overdue if any, else soonest due. None if no usable history."""
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

    return NextMaintenance(
        service_id=sid,
        label=_service_label(sid),
        last_service_miles=last_f,
        effective_interval_miles=interval,
        next_due_at_miles=next_at,
        remaining_miles=remaining,
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

    for title, demo in examples:
        print(f"\n=== {title} ===")
        n = next_maintenance(demo)
        if n is None:
            print("No next maintenance: add last_service_miles for at least one service type.")
        else:
            print(
                "CSV tier:",
                tier_for.get(n.matched_brand_key, "?"),
                "| service_factor:",
                round(n.service_factor, 3),
                "| brand:",
                n.matched_brand_key,
            )
            print(n.summary())
