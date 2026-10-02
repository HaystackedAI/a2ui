import json
from strands import tool
from datasource.restaurant_list import RESTAURANTS


@tool
def get_restaurants(cuisine: str, location: str, count: int = 5) -> str:
    """Get a list of restaurants for a cuisine and location.

    Args:
        cuisine: cuisine type, e.g. "chinese".
        location: city/area, e.g. "New York".
        count: max number of restaurants to return.

    Returns a JSON array of restaurants (name, detail, imageUrl, rating, infoLink, address).
    """
    # Sample-level: static NYC dataset; cuisine/location accepted but not filtered.
    return json.dumps(RESTAURANTS[:count])