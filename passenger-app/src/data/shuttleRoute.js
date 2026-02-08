// Predefined shuttle route path following actual campus roads
// This defines the exact road path the shuttle follows
// Coordinates are [lng, lat] for Mapbox

// Main Route: TF -> Evandy -> Pentagon -> JQB -> Maths Dept -> Political Science -> NNB -> Biochem -> Pharmacy -> UGBS -> Language Centre -> CC -> Pentagon -> Evandy -> TF

const shuttleRoutePath = [
    // TF Hostel - starting point
    [-0.18208390732511182, 5.666535887462582],

    // Road from TF to Evandy
    [-0.1819, 5.6650],

    // Evandy Hostel
    [-0.1817590633629549, 5.663094760032826],

    // Road from Evandy to Pentagon
    [-0.1818, 5.6610],
    [-0.1818, 5.6590],

    // Pentagon
    [-0.18177955790804562, 5.657448763209479],

    // Road from Pentagon to JQB
    [-0.1820, 5.6560],
    [-0.1825, 5.6545],

    // JQB
    [-0.18321972801647923, 5.653266186451385],

    // Road from JQB to Maths Dept
    [-0.1840, 5.6535],

    // Maths Dept
    [-0.1849889069977223, 5.653843617409258],

    // Road from Maths to Political Science
    [-0.1855, 5.6542],

    // Political Science
    [-0.1860028461165547, 5.654713778801053],

    // Road from Political Science to NNB
    [-0.1868, 5.6555],

    // NNB
    [-0.18770534351577942, 5.656213632021257],

    // Road from NNB to Biochem
    [-0.1885, 5.6555],
    [-0.1890, 5.6550],

    // Biochemistry Dept
    [-0.18936392948048408, 5.6548594251698905],

    // Road from Biochem to Pharmacy
    [-0.1893, 5.6545],

    // Pharmacy
    [-0.1892665489689635, 5.654039970264345],

    // Road from Pharmacy to UGBS
    [-0.1891, 5.6535],

    // UGBS
    [-0.1889719836543335, 5.6528187834024894],

    // Road from UGBS to Language Centre
    [-0.1892, 5.6515],
    [-0.1893, 5.6505],

    // Language Centre
    [-0.18927936922653807, 5.649985476844237],

    // Road from Language Centre to CC
    [-0.1885, 5.6485],
    [-0.1875, 5.6475],

    // CC (Central Cafeteria)
    [-0.1868756662706847, 5.647024205093812],

    // Road from CC back to Pentagon
    [-0.1850, 5.6500],
    [-0.1835, 5.6530],
    [-0.1825, 5.6555],

    // Pentagon (second pass)
    [-0.18177955790804562, 5.657448763209479],

    // Road from Pentagon to Evandy
    [-0.1818, 5.6600],
    [-0.1818, 5.6620],

    // Evandy (second pass)
    [-0.1817590633629549, 5.663094760032826],

    // Road from Evandy back to TF
    [-0.1819, 5.6650],

    // Back to TF (loop complete)
    [-0.18208390732511182, 5.666535887462582],
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
