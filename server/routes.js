/**
 * Legon Campus Shuttle Route Data
 * Pre-defined stops and route information
 */

const legonStops = [
    {
        id: 'ugbs',
        name: 'UGBS',
        coordinates: [5.6528187834024894, -0.1889719836543335],
        description: 'University of Ghana Business School'
    },
    {
        id: 'centralCafeteria',
        name: 'CC',
        coordinates: [5.647024205093812, -0.1868756662706847],
        description: 'Central Cafeteria'
    },
    {
        id: 'jqb',
        name: 'JQB',
        coordinates: [5.653266186451385, -0.18321972801647923],
        description: 'Lecture Building'
    },
    {
        id: 'TF',
        name: 'TF Hostel',
        coordinates: [5.666535887462582, -0.18208390732511182],
        description: 'TF Hostel'
    },
    {
        id: 'Evandy',
        name: 'Evandy Hostel',
        coordinates: [5.663094760032826, -0.1817590633629549],
        description: 'Evandy Hostel'
    },
    {
        id: 'pentagon',
        name: 'Pentagon',
        coordinates: [5.657448763209479, -0.18177955790804562],
        description: 'Pentagon hostel area'
    },
    {
        id: 'math',
        name: 'Maths Dept',
        coordinates: [5.653843617409258, -0.1849889069977223],
        description: 'Mathematics Department'
    },
    {
        id: 'NNB',
        name: 'NNB',
        coordinates: [5.656213632021257, -0.18770534351577942],
        description: 'Lecture Hall'
    },

    {
        id: 'biochem',
        name: 'Biochemistry Dept',
        coordinates: [5.6548594251698905, -0.18936392948048408],
        description: 'Biochemistry Department'
    },
    {
        id: 'politicalScience',
        name: 'Political Science',
        coordinates: [5.654713778801053, -0.1860028461165547],
        description: 'Political Science Department'
    },
    {
        id: 'pharmacy',
        name: 'Pharmacy',
        coordinates: [5.654039970264345, -0.1892665489689635],
        description: 'Pharmacy Department'
    },
    {
        id: 'language',
        name: 'Language Centre',
        coordinates: [5.649985476844237, -0.18927936922653807],
        description: 'Language Centre'
    }
];

// Route order - the sequence of stops the shuttle follows
const routeOrder = ['TF', 'Evandy', 'pentagon', 'jqb', 'math', 'politicalScience', 'NNB', 'biochem', 'pharmacy', 'ugbs', 'language', 'centralCafeteria'];

// Calculate bearing (heading) from point A to point B in degrees
function calculateBearing(lat1, lng1, lat2, lng2) {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
        Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360
}

// Get distance between two points in km (Haversine formula)
function getDistanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Find the next stop based on position and heading
function getNextStopInDirection(lat, lng, heading) {
    // Find the two closest stops
    const stopsWithDistance = legonStops.map(stop => ({
        ...stop,
        distance: getDistanceKm(lat, lng, stop.coordinates[0], stop.coordinates[1])
    })).sort((a, b) => a.distance - b.distance);

    const closestStop = stopsWithDistance[0];

    // If very close to a stop (within 50m), we're likely at that stop
    // Return the NEXT stop in the route order
    if (closestStop.distance < 0.05) {
        const currentIndex = routeOrder.indexOf(closestStop.id);
        if (currentIndex !== -1) {
            const nextIndex = (currentIndex + 1) % routeOrder.length;
            const nextStopId = routeOrder[nextIndex];
            return legonStops.find(s => s.id === nextStopId);
        }
    }

    // Calculate bearing to closest stops and compare with heading
    // Pick the stop we're heading toward
    for (const stop of stopsWithDistance.slice(0, 3)) {
        const bearingToStop = calculateBearing(lat, lng, stop.coordinates[0], stop.coordinates[1]);
        const bearingDiff = Math.abs(heading - bearingToStop);
        const normalizedDiff = bearingDiff > 180 ? 360 - bearingDiff : bearingDiff;

        // If heading roughly toward this stop (within 90 degrees), it's likely the next stop
        if (normalizedDiff < 90) {
            return stop;
        }
    }

    // Fallback: return closest stop in route order that's ahead of us
    const closestIndex = routeOrder.indexOf(closestStop.id);
    if (closestIndex !== -1) {
        const nextIndex = (closestIndex + 1) % routeOrder.length;
        const nextStopId = routeOrder[nextIndex];
        return legonStops.find(s => s.id === nextStopId);
    }

    return closestStop;
}

const defaultRoute = {
    id: 'main-route',
    name: 'Main Campus Loop',
    stops: ['TF', 'Evandy', 'pentagon', 'jqb', 'math', 'politicalScience', 'NNB', 'biochem', 'pharmacy', 'ugbs', 'language', 'centralCafeteria'],
    color: '#3B82F6'
};

module.exports = {
    legonStops,
    defaultRoute,
    routeOrder,
    calculateBearing,
    getNextStopInDirection,
    getDistanceKm
};

