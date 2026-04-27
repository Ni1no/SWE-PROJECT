#!/usr/bin/env python3
"""Stdin JSON -> stdout JSON for Node bridge (REQ-07/REQ-09 via obd_maintenance_advisor)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from obd_maintenance_advisor import (  # noqa: E402
    ServiceContext,
    next_maintenance,
    next_maintenance_to_dict,
)


def main() -> None:
    body = json.load(sys.stdin)
    ctx_dict = body.get("context") or {}
    brand_csv = body.get("brand_csv")
    metrics_catalog_csv = body.get("metrics_catalog_csv")
    k_age = body.get("k_age", 0.04)
    base_intervals = body.get("base_intervals_miles")
    if base_intervals is not None:
        base_intervals = {k: float(v) for k, v in base_intervals.items()}

    my_raw = ctx_dict.get("model_year")
    model_year = None
    if my_raw is not None and str(my_raw).strip() != "":
        model_year = int(float(my_raw))

    last_map: dict[str, float | None] = {}
    for k, v in (ctx_dict.get("last_service_miles") or {}).items():
        if v is None or str(v).strip() == "":
            last_map[k] = None
        else:
            last_map[k] = float(v)

    ctx = ServiceContext(
        odometer_miles=float(ctx_dict["odometer_miles"]),
        vehicle_age_years=float(ctx_dict.get("vehicle_age_years", 5.0)),
        vehicle_make=ctx_dict.get("vehicle_make"),
        vehicle_model=ctx_dict.get("vehicle_model"),
        model_year=model_year,
        last_service_miles=last_map,
    )
    brand_path = Path(brand_csv) if brand_csv else None
    metrics_catalog_path = Path(metrics_catalog_csv) if metrics_catalog_csv else None
    n = next_maintenance(
        ctx,
        brand_csv=brand_path,
        metrics_catalog_csv=metrics_catalog_path,
        k_age=float(k_age),
        base_intervals_miles=base_intervals,
    )
    json.dump(next_maintenance_to_dict(n), sys.stdout)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
