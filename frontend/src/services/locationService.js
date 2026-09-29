/**
 * SWMS Smart Location & Real-World Geolocation Service
 * Handles live GPS tracking, reverse geocoding, distance calculation,
 * turn-by-turn navigation links, and dynamic local smart bin deployment.
 */

// Memory cache for reverse geocoding to avoid rate-limiting Nominatim
const geocodeCache = new Map();

/**
 * Calculates Haversine distance between two coordinates in kilometers.
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Formats distance into human-friendly representation (meters or kilometers)
 */
export function formatDistance(distanceKm) {
  if (distanceKm == null || isNaN(distanceKm)) return '—';
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Estimates walking time (assumes 4.8 km/h pedestrian velocity)
 */
export function estimateWalkingTime(distanceKm) {
  if (distanceKm == null || isNaN(distanceKm)) return '';
  const minutes = Math.round((distanceKm / 4.8) * 60);
  if (minutes < 1) return '< 1 min walk';
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMins = minutes % 60;
    return `~${hours}h ${remMins}m walk`;
  }
  return `~${minutes} min walk`;
}

/**
 * Get current browser GPS location with high accuracy and sensible timeouts
 */
export function getCurrentUserLocation(options = {}) {
  const { enableHighAccuracy = true, timeout = 9000, maximumAge = 5000 } = options;

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser or environment.'));
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy || 10),
          altitude: pos.coords.altitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        let msg = 'Failed to obtain live GPS location.';
        if (err.code === 1) {
          msg = 'Location permission was denied. Please allow location access in your browser settings.';
        } else if (err.code === 2) {
          msg = 'Position unavailable. GPS signal could not be acquired.';
        } else if (err.code === 3) {
          msg = 'GPS request timed out. Retrying with network location...';
        }
        reject(new Error(msg));
      },
      { enableHighAccuracy, timeout, maximumAge }
    );
  });
}

/**
 * Watch continuous live GPS location changes (for navigation and live tracking)
 */
export function watchLiveLocation(onSuccess, onError, options = {}) {
  if (typeof window === 'undefined' || !navigator?.geolocation) {
    if (onError) onError(new Error('Geolocation not supported.'));
    return null;
  }

  const { enableHighAccuracy = true, timeout = 12000, maximumAge = 2000 } = options;

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      if (onSuccess) {
        onSuccess({
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy || 10),
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          timestamp: pos.timestamp,
        });
      }
    },
    (err) => {
      if (onError) onError(err);
    },
    { enableHighAccuracy, timeout, maximumAge }
  );

  return watchId;
}

/**
 * Clear GPS location watcher
 */
export function clearLiveLocationWatch(watchId) {
  if (watchId != null && typeof window !== 'undefined' && navigator?.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Reverse Geocode GPS coordinates into human-readable real-world street address
 * Uses OpenStreetMap Nominatim reverse geocoding API with memory caching
 */
export async function reverseGeocode(latitude, longitude) {
  if (latitude == null || longitude == null) return null;

  const lat = parseFloat(latitude.toFixed(5));
  const lng = parseFloat(longitude.toFixed(5));
  const cacheKey = `${lat},${lng}`;

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SmartWasteManagementSystem-SWMS/2.0',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const street = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || addr.quarter || '';
        const landmark = addr.amenity || addr.shop || addr.building || '';
        const city = addr.city || addr.town || addr.village || addr.county || '';
        const state = addr.state || '';
        const postcode = addr.postcode || '';

        const parts = [landmark, street, city, state, postcode].filter(Boolean);
        const formatted = parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 3).join(',') || `Area at ${lat}, ${lng}`;

        const result = {
          formattedAddress: formatted,
          street: street || landmark || 'Local Road',
          city: city || 'City Area',
          state: state || '',
          postcode: postcode || '',
          raw: data,
        };

        geocodeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    // Graceful fallback when network or CORS restricts
  }

  // Fallback string if API call fails
  const fallback = {
    formattedAddress: `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    street: `Coordinates [${lat.toFixed(4)}, ${lng.toFixed(4)}]`,
    city: 'Local Ward Zone',
    state: '',
    postcode: '',
  };
  return fallback;
}

/**
 * Generate native Google Maps directions URL for walking or driving
 */
export function getGoogleMapsDirectionsUrl({ destinationLat, destinationLng, originLat, originLng, travelMode = 'walking' }) {
  let url = `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}&travelmode=${travelMode}`;
  if (originLat != null && originLng != null) {
    url += `&origin=${originLat},${originLng}`;
  }
  return url;
}

/**
 * Generate native Google Maps multi-waypoint route for waste collector fleet
 */
export function getMultiStopGoogleMapsUrl({ origin, stops = [] }) {
  if (!stops || stops.length === 0) return 'https://www.google.com/maps';

  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, stops.length - 1);

  let url = `https://www.google.com/maps/dir/?api=1`;
  if (origin) {
    url += `&origin=${origin.latitude || origin[0]},${origin.longitude || origin[1]}`;
  }
  url += `&destination=${destination.latitude || destination[0]},${destination.longitude || destination[1]}`;

  if (waypoints.length > 0) {
    const waypointsStr = waypoints
      .map((s) => `${s.latitude || s[0]},${s.longitude || s[1]}`)
      .join('|');
    url += `&waypoints=${encodeURIComponent(waypointsStr)}`;
  }

  url += `&travelmode=driving`;
  return url;
}

/**
 * Deploys realistic smart bins clustered around any geographic location in the world.
 * Essential for testing live location features anywhere outside the default seed coordinates!
 */
export function generateLocalSmartBins(centerLat, centerLng, count = 8) {
  const LOCATIONS = [
    { name: 'City Central Promenade', type: 'Plastic', defaultFill: 92, status: 'Critical' },
    { name: 'Public Library & Study Square', type: 'Paper', defaultFill: 42, status: 'Normal' },
    { name: 'Community Health Park North', type: 'Organic', defaultFill: 78, status: 'Almost Full' },
    { name: 'Transit Metro Station Gate 2', type: 'Metal', defaultFill: 88, status: 'Almost Full' },
    { name: 'Shopping Arcade Recycling Bay', type: 'Glass', defaultFill: 64, status: 'Moderate' },
    { name: 'Tech Innovation Hub Tower C', type: 'E-Waste', defaultFill: 24, status: 'Normal' },
    { name: 'Municipal Sports Arena Gate', type: 'General', defaultFill: 55, status: 'Moderate' },
    { name: 'Botanical Garden Eco-Walkway', type: 'Organic', defaultFill: 31, status: 'Normal' },
    { name: 'Civic Center Bus Terminal', type: 'Plastic', defaultFill: 94, status: 'Critical' },
    { name: 'High Street Food Court Bay', type: 'Organic', defaultFill: 86, status: 'Almost Full' },
  ];

  // Distribute within 250m to 1200m radius
  const bins = [];
  for (let i = 0; i < Math.min(count, LOCATIONS.length); i++) {
    const loc = LOCATIONS[i];
    // Random angle and radial offset (approx 0.002 to 0.008 degrees ~ 200m - 900m)
    const angle = (i / count) * 2 * Math.PI + (Math.sin(i * 3) * 0.4);
    const radiusOffset = 0.0025 + ((i % 4) * 0.002);
    const lat = centerLat + Math.sin(angle) * radiusOffset;
    const lng = centerLng + Math.cos(angle) * (radiusOffset * 1.2);

    const fill = loc.defaultFill;
    const status = fill >= 91 ? 'Critical' : fill >= 76 ? 'Almost Full' : fill >= 51 ? 'Moderate' : 'Normal';

    bins.push({
      id: 1000 + i + 1,
      bin_code: `LOCAL-BIN-${String(i + 1).padStart(3, '0')}`,
      location_name: `${loc.name} (Live Area)`,
      latitude: parseFloat(lat.toFixed(5)),
      longitude: parseFloat(lng.toFixed(5)),
      capacity: 100.0,
      current_fill_percentage: fill,
      waste_type: 'All-in-One Multi-Stream AI',
      status,
      is_simulated: true,
      all_types_available: true,
      battery_level_pct: 90 + (i % 8),
      gas_level_ppm: 22 + (fill > 80 ? 45 : 10),
      ward: `Zone ${(i % 3) + 1}`,
      chambers: [
        { type: 'Plastic', icon: '🥤', percentage: 32, color: '#3b82f6', current_kg: Math.round(fill * 0.32 * 0.25 * 10) / 10 },
        { type: 'Organic', icon: '🍏', percentage: 28, color: '#10b981', current_kg: Math.round(fill * 0.28 * 0.25 * 10) / 10 },
        { type: 'Paper', icon: '📦', percentage: 20, color: '#f59e0b', current_kg: Math.round(fill * 0.20 * 0.25 * 10) / 10 },
        { type: 'Glass', icon: '🍾', percentage: 12, color: '#14b8a6', current_kg: Math.round(fill * 0.12 * 0.25 * 10) / 10 },
        { type: 'Metal', icon: '⚙️', percentage: 8, color: '#6366f1', current_kg: Math.round(fill * 0.08 * 0.25 * 10) / 10 },
      ],
    });
  }

  return bins;
}
