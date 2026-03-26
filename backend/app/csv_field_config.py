"""Configurable CSV field mapping and validation rules for robot log files.

To add/remove aliases: edit FIELD_ALIASES.
To change validation rules: edit FIELD_RULES.
"""
from __future__ import annotations
import re
from datetime import datetime
from typing import Any


# ---------------------------------------------------------------------------
# Alias mapping  (canonical_name -> list[accepted aliases])
# The canonical name itself does NOT need to appear in the alias list.
# Matching is done after normalize(), so casing / symbols don't matter.
# ---------------------------------------------------------------------------
FIELD_ALIASES: dict[str, list[str]] = {
    "robot_id":        ["robotid", "robot_id", "robotID", "RobotId", "rid"],
    "timestamp":       ["time", "ts", "datetime", "Timestamp", "recorded_at"],
    "location_x":      ["loc_x", "x", "locationX", "location_x", "pos_x"],
    "location_y":      ["loc_y", "y", "locationY", "location_y", "pos_y"],
    "battery_level":   ["battery", "batteryLevel", "battery_pct", "bat"],
    "device_a_status": ["deviceAStatus", "device_a", "dev_a_status", "devAStatus"],
    "device_b_status": ["deviceBStatus", "device_b", "dev_b_status", "devBStatus"],
    "speed":           ["Speed", "velocity", "spd", "current_speed"],
    "error_code":      ["errorCode", "error", "err_code", "errcode"],
}

# All canonical field names (order preserved for display)
ALL_FIELDS: list[str] = list(FIELD_ALIASES.keys())


# ---------------------------------------------------------------------------
# normalize: strip all non-alphanumeric chars, lowercase
# ---------------------------------------------------------------------------
def normalize(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


# ---------------------------------------------------------------------------
# Build a lookup: normalize(alias) -> canonical_name
# ---------------------------------------------------------------------------
def _build_lookup() -> dict[str, str]:
    lookup: dict[str, str] = {}
    for canonical, aliases in FIELD_ALIASES.items():
        # canonical itself
        lookup[normalize(canonical)] = canonical
        for alias in aliases:
            lookup[normalize(alias)] = canonical
    return lookup


ALIAS_LOOKUP: dict[str, str] = _build_lookup()


# ---------------------------------------------------------------------------
# Validation + conversion helpers
# ---------------------------------------------------------------------------
_DEVICE_STATUS_VALUES = {"ok", "warning", "error"}
_ROBOT_ID_RE = re.compile(r"^robot_\d{3}$")


def _to_float(v: str) -> float:
    return float(v)


def _to_int_via_float(v: str) -> int:
    """Accept '85', '85.0', '85.9' -> int (truncate after float conversion)."""
    return int(float(v))


class FieldError(Exception):
    pass


def validate_and_convert(canonical: str, raw: str) -> Any:
    """Validate *raw* string value for *canonical* field.

    Returns the converted (typed) value on success.
    Raises FieldError with a human-readable message on failure.
    """
    v = raw.strip() if raw is not None else ""

    if canonical == "robot_id":
        if not _ROBOT_ID_RE.match(v):
            raise FieldError(
                f"Must match pattern robot_XXX (3 digits), got '{v}'"
            )
        return v

    if canonical == "timestamp":
        try:
            datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            raise FieldError(f"Not a valid ISO 8601 timestamp, got '{v}'")
        return v

    if canonical == "location_x":
        try:
            return _to_float(v)
        except (ValueError, TypeError):
            raise FieldError(f"Must be a number (float), got '{v}'")

    if canonical == "location_y":
        try:
            return _to_float(v)
        except (ValueError, TypeError):
            raise FieldError(f"Must be a number (float), got '{v}'")

    if canonical == "battery_level":
        try:
            result = _to_int_via_float(v)
        except (ValueError, TypeError):
            raise FieldError(f"Must be a number, got '{v}'")
        if not (0 <= result <= 100):
            raise FieldError(f"Must be between 0 and 100, got {result}")
        return result

    if canonical == "device_a_status":
        if v.lower() not in _DEVICE_STATUS_VALUES:
            raise FieldError(
                f"Must be one of {sorted(_DEVICE_STATUS_VALUES)}, got '{v}'"
            )
        return v.lower()

    if canonical == "device_b_status":
        if v.lower() not in _DEVICE_STATUS_VALUES:
            raise FieldError(
                f"Must be one of {sorted(_DEVICE_STATUS_VALUES)}, got '{v}'"
            )
        return v.lower()

    if canonical == "speed":
        try:
            result = _to_float(v)
        except (ValueError, TypeError):
            raise FieldError(f"Must be a non-negative number, got '{v}'")
        if result < 0:
            raise FieldError(f"Must be >= 0, got {result}")
        return result

    if canonical == "error_code":
        if v == "" or v is None:
            return None
        try:
            return int(float(v))
        except (ValueError, TypeError):
            raise FieldError(f"Must be an integer or empty, got '{v}'")

    # unknown canonical (should not happen)
    return v


# ---------------------------------------------------------------------------
# Field metadata for frontend display (the permanent warning banner)
# ---------------------------------------------------------------------------
FIELD_SPECS: list[dict] = [
    {
        "field": "robot_id",
        "type": "string",
        "rule": "Pattern: robot_XXX (3 digits, e.g. robot_001)",
        "example": "robot_001",
    },
    {
        "field": "timestamp",
        "type": "string",
        "rule": "ISO 8601 format (e.g. 2024-03-15T14:23:01Z)",
        "example": "2024-03-15T14:23:01Z",
    },
    {
        "field": "location_x",
        "type": "float",
        "rule": "Any numeric value",
        "example": "12.34",
    },
    {
        "field": "location_y",
        "type": "float",
        "rule": "Any numeric value",
        "example": "-5.67",
    },
    {
        "field": "battery_level",
        "type": "int",
        "rule": "Integer 0–100",
        "example": "85",
    },
    {
        "field": "device_a_status",
        "type": "string",
        "rule": "Enum: ok | warning | error",
        "example": "ok",
    },
    {
        "field": "device_b_status",
        "type": "string",
        "rule": "Enum: ok | warning | error",
        "example": "warning",
    },
    {
        "field": "speed",
        "type": "float",
        "rule": "Non-negative number (m/s)",
        "example": "1.5",
    },
    {
        "field": "error_code",
        "type": "int | null",
        "rule": "Integer or empty (null when no error)",
        "example": "",
    },
]
