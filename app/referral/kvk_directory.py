"""
KVK (Krishi Vigyan Kendra) Directory — Static Seed List for Gujarat.

This is a small verified subset for hackathon/demo purposes.
Where exact contact details could not be independently verified,
entries are marked with the state agriculture helpline instead.

Future work: integrate with a live KVK directory API or ICAR database.
"""

# Each entry keyed by district name (lowercase)
KVK_DIRECTORY = {
    'ahmedabad': {
        'name': 'KVK Ahmedabad (Arnej)',
        'district': 'Ahmedabad',
        'state': 'Gujarat',
        'latitude': 22.5769,
        'longitude': 72.3176,
        'contact': 'Contact via Gujarat State Agriculture Helpline: 1800-180-1551',
        'institution': 'Anand Agricultural University',
        'note': 'Serves Ahmedabad and Gandhinagar districts',
    },
    'anand': {
        'name': 'KVK Anand',
        'district': 'Anand',
        'state': 'Gujarat',
        'latitude': 22.5645,
        'longitude': 72.9289,
        'contact': 'Contact via Gujarat State Agriculture Helpline: 1800-180-1551',
        'institution': 'Anand Agricultural University',
        'note': 'Central Gujarat crop protection and soil testing hub',
    },
    'vadodara': {
        'name': 'KVK Vadodara',
        'district': 'Vadodara',
        'state': 'Gujarat',
        'latitude': 22.3072,
        'longitude': 73.1812,
        'contact': 'Contact via Gujarat State Agriculture Helpline: 1800-180-1551',
        'institution': 'Anand Agricultural University',
        'note': 'Covers Vadodara, Panchmahal, and Chhota Udepur',
    },
    'surat': {
        'name': 'KVK Surat (Tapi)',
        'district': 'Surat',
        'state': 'Gujarat',
        'latitude': 21.1702,
        'longitude': 72.8311,
        'contact': 'Contact via Gujarat State Agriculture Helpline: 1800-180-1551',
        'institution': 'Navsari Agricultural University',
        'note': 'South Gujarat sugarcane and rice belt',
    },
    'rajkot': {
        'name': 'KVK Rajkot',
        'district': 'Rajkot',
        'state': 'Gujarat',
        'latitude': 22.3039,
        'longitude': 70.8022,
        'contact': 'Contact via Gujarat State Agriculture Helpline: 1800-180-1551',
        'institution': 'Junagadh Agricultural University',
        'note': 'Saurashtra groundnut and cotton advisory',
    },
}


def lookup_nearest_kvk(district: str = '', latitude: float = None, longitude: float = None) -> dict:
    """
    Returns the nearest KVK contact based on district name or GPS coordinates.
    Falls back to state helpline if no match found.
    """
    # Try exact district match first
    if district:
        clean = district.strip().lower()
        if clean in KVK_DIRECTORY:
            return KVK_DIRECTORY[clean]

    # If coordinates provided, find nearest by distance
    if latitude is not None and longitude is not None:
        import math

        def haversine(lat1, lon1, lat2, lon2):
            r = 6371.0
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
            return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        nearest = None
        min_dist = float('inf')
        for kvk in KVK_DIRECTORY.values():
            dist = haversine(latitude, longitude, kvk['latitude'], kvk['longitude'])
            if dist < min_dist:
                min_dist = dist
                nearest = kvk

        if nearest:
            return nearest

    # Fallback
    return {
        'name': 'Gujarat State Agriculture Helpline',
        'district': 'State-wide',
        'state': 'Gujarat',
        'contact': '1800-180-1551 (Toll Free)',
        'institution': 'Department of Agriculture, Gujarat',
        'note': 'No specific KVK match found. Contact the state agriculture helpline for nearest extension services.',
    }
