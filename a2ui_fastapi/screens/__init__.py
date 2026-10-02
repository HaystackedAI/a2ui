"""Screen assembly layer.

A "screen" = a static A2UI layout (createSurface + updateComponents) stored as a
versioned JSON asset under `screens/v0_9/`, PLUS a runtime `updateDataModel`
message that injects the data. Layout is the contract (rarely changes); data is
per-request. Keeping them apart mirrors A2UI's own split and lets these same
layout files later serve as few-shot examples for an LLM agent (Stage 3).

Public interface (what main.py depends on):
    restaurant_list(restaurants) -> list[dict]
    booking_form(restaurant_name, image_url, address) -> list[dict]
    confirmation(restaurant_name, party_size, reservation_time, dietary, image_url) -> list[dict]
"""

import json
from functools import lru_cache
from pathlib import Path

A2UI_VERSION = "v0.9"
_LAYOUT_DIR = Path(__file__).parent / "v0_9"


@lru_cache(maxsize=None)
def _layout_raw(name: str) -> str:
    """Read a layout asset once (cached). Returns raw JSON text."""
    return (_LAYOUT_DIR / f"{name}.json").read_text(encoding="utf-8")


def _layout(name: str) -> list[dict]:
    """Static layout messages (createSurface + updateComponents) for a screen.
    Parsed fresh each call so callers can't mutate the cached asset."""
    return json.loads(_layout_raw(name))


def _data_model(surface_id: str, value: dict) -> dict:
    """Build the runtime updateDataModel message that fills a surface's data."""
    return {
        "version": A2UI_VERSION,
        "updateDataModel": {"surfaceId": surface_id, "path": "/", "value": value},
    }


def restaurant_list(restaurants: list[dict]) -> list[dict]:
    return _layout("restaurant_list") + [
        _data_model("default", {"title": "COA", "items": restaurants})
    ]


def booking_form(restaurant_name: str, image_url: str, address: str) -> list[dict]:
    return _layout("booking_form") + [
        _data_model(
            "booking-form",
            {
                "title": f"Book a Table at {restaurant_name}",
                "address": address,
                "restaurantName": restaurant_name,
                "partySize": "2",
                "reservationTime": "",
                "dietary": "",
                "imageUrl": image_url,
            },
        )
    ]


def confirmation(
    restaurant_name: str,
    party_size: str,
    reservation_time: str,
    dietary: str,
    image_url: str,
) -> list[dict]:
    return _layout("confirmation") + [
        _data_model(
            "confirmation",
            {
                "title": f"Booking Confirmed at {restaurant_name}",
                "bookingDetails": f"{party_size} people at {reservation_time or 'TBD'}",
                "dietaryRequirements": (
                    f"Dietary Requirements: {dietary}"
                    if dietary
                    else "No dietary requirements specified"
                ),
                "imageUrl": image_url,
            },
        )
    ]
