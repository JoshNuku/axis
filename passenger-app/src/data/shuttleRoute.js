// Predefined shuttle route path following actual campus roads
// This defines the exact road path the shuttle follows
// Coordinates are [lng, lat] for Mapbox

// The route goes through these stops in order:
// UGBS -> CC -> JQB -> Maths Dept -> Pentagon -> NNB -> (loops back)

const shuttleRoutePath = [
    // UGBS area - starting point
    [-0.1889719836543335, 5.6528187834024894],

    // Road south from UGBS toward CC
    [-0.18897, 5.6515],
    [-0.18890, 5.6500],
    [-0.18875, 5.6485],

    // CC (Central Cafeteria)
    [-0.1868756662706847, 5.647024205093812],

    // Road from CC heading northeast toward JQB
    [-0.1860, 5.6480],
    [-0.1845, 5.6495],
    [-0.1830, 5.6510],

    // JQB
    [-0.18174035739304048, 5.6525834611765005],

    // Road from JQB to Maths Dept (heading northwest)
    [-0.1825, 5.6530],
    [-0.1835, 5.6535],

    // Maths Dept
    [-0.18442869140145893, 5.654102662727119],

    // Road from Maths to Pentagon (heading north)
    [-0.1835, 5.6550],
    [-0.1825, 5.6560],

    // Pentagon
    [-0.18177955790804562, 5.657448763209479],

    // Road from Pentagon to NNB (heading west)
    [-0.1840, 5.6570],
    [-0.1860, 5.6565],

    // NNB
    [-0.18770534351577942, 5.656213632021257],

    // Road from NNB back toward UGBS
    [-0.1880, 5.6550],
    [-0.1885, 5.6540],

    // Back to UGBS (loop complete)
    [-0.1889719836543335, 5.6528187834024894],
];

// Helper to find the closest point on the route to a given position
export function findClosestRoutePoint(position) {
    if (!position) return 0;

    let closestIndex = 0;
    let minDist = Infinity;

    shuttleRoutePath.forEach((coord, index) => {
        const dx = coord[0] - position.lng;
        const dy = coord[1] - position.lat;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
            minDist = dist;
            closestIndex = index;
        }
    });

    return closestIndex;
}

// Get the route segment from current position to a stop
export function getRouteToStop(currentPosition, stopCoordinates) {
    if (!currentPosition || !stopCoordinates) return [];

    const startIndex = findClosestRoutePoint(currentPosition);

    // Find the closest route point to the destination stop
    let endIndex = 0;
    let minDist = Infinity;
    shuttleRoutePath.forEach((coord, index) => {
        const dx = coord[0] - stopCoordinates[0];
        const dy = coord[1] - stopCoordinates[1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
            minDist = dist;
            endIndex = index;
        }
    });

    // Build the route segment (handle wrapping for circular route)
    const routeSegment = [[currentPosition.lng, currentPosition.lat]];

    if (startIndex <= endIndex) {
        // Simple forward path
        for (let i = startIndex; i <= endIndex; i++) {
            routeSegment.push(shuttleRoutePath[i]);
        }
    } else {
        // Wrap around (going forward through the loop)
        for (let i = startIndex; i < shuttleRoutePath.length; i++) {
            routeSegment.push(shuttleRoutePath[i]);
        }
        for (let i = 0; i <= endIndex; i++) {
            routeSegment.push(shuttleRoutePath[i]);
        }
    }

    // Add the exact stop location at the end
    routeSegment.push(stopCoordinates);

    return routeSegment;
}

export default shuttleRoutePath;
