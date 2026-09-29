/**
 * Route Planning Service for Waste Collection
 * Implements a Nearest-Neighbor Heuristic algorithm with Priority-Weighting.
 *
 * NOTE: This is a clearly documented heuristic approach designed for efficient
 * collection stop sequencing. It is not claimed to be a mathematically optimal
 * solution to the NP-hard Traveling Salesperson Problem (TSP).
 */

/**
 * Calculates great-circle distance between two GPS coordinates using the Haversine formula.
 * @returns {number} distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
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
 * Computes an ordered sequence of collection stops using a greedy nearest-neighbor heuristic.
 * Critical priority stops are prioritized first, followed by nearest proximity.
 *
 * @param {Object} startLocation - { latitude, longitude }
 * @param {Array} collectionTasks - Array of collection requests containing bin coordinates
 * @returns {Object} { orderedStops, totalDistanceKm, estimatedDurationMinutes, algorithm }
 */
function planCollectionRoute(startLocation, collectionTasks) {
  if (!collectionTasks || collectionTasks.length === 0) {
    return {
      orderedStops: [],
      totalDistanceKm: 0,
      estimatedDurationMinutes: 0,
      algorithm: 'Nearest-Neighbor Heuristic (Empty)',
    };
  }

  // Fallback default coordinates if start location not provided (e.g., city depot)
  let currentLat = startLocation?.latitude || 12.9716;
  let currentLon = startLocation?.longitude || 77.5946;

  // Separate tasks by priority groups: Critical first, then High, then others
  const remaining = [...collectionTasks];
  const orderedStops = [];
  let totalDistance = 0;

  while (remaining.length > 0) {
    let nearestIndex = -1;
    let minDistance = Infinity;

    // Check if any Critical priority bins remain in unvisited list
    const hasCritical = remaining.some((t) => t.priority === 'Critical');

    for (let i = 0; i < remaining.length; i++) {
      const task = remaining[i];
      const binLat = task.bin?.latitude || task.latitude;
      const binLon = task.bin?.longitude || task.longitude;

      if (binLat == null || binLon == null) continue;

      // If critical items exist, only evaluate critical items in this round
      if (hasCritical && task.priority !== 'Critical') continue;

      const dist = haversineDistance(currentLat, currentLon, binLat, binLon);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }

    if (nearestIndex === -1) {
      // Fallback if none matched
      nearestIndex = 0;
      minDistance = 0;
    }

    const selectedTask = remaining.splice(nearestIndex, 1)[0];
    const taskLat = selectedTask.bin?.latitude || selectedTask.latitude;
    const taskLon = selectedTask.bin?.longitude || selectedTask.longitude;

    totalDistance += minDistance;
    orderedStops.push({
      stopNumber: orderedStops.length + 1,
      taskId: selectedTask.id,
      binCode: selectedTask.bin?.bin_code,
      locationName: selectedTask.bin?.location_name,
      wasteType: selectedTask.bin?.waste_type,
      fillPercentage: selectedTask.bin?.current_fill_percentage,
      priority: selectedTask.priority,
      status: selectedTask.status,
      latitude: taskLat,
      longitude: taskLon,
      distanceFromPreviousKm: minDistance,
      accumulatedDistanceKm: Math.round(totalDistance * 100) / 100,
    });

    currentLat = taskLat;
    currentLon = taskLon;
  }

  // Estimate duration assuming 25 km/h urban speed + 10 mins service time per stop
  const travelTimeMinutes = (totalDistance / 25) * 60;
  const serviceTimeMinutes = orderedStops.length * 10;
  const estimatedDurationMinutes = Math.round(travelTimeMinutes + serviceTimeMinutes);

  return {
    orderedStops,
    totalDistanceKm: Math.round(totalDistance * 100) / 100,
    estimatedDurationMinutes,
    algorithm: 'Priority-Weighted Nearest-Neighbor Heuristic (Not TSP-optimal)',
  };
}

module.exports = {
  haversineDistance,
  planCollectionRoute,
};

