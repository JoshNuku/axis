import legonStops from '../data/legonStops';

// Get distance between two points in km (Haversine formula)
function getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Estimate ETA based on distance (assuming ~20 km/h average speed on campus)
function estimateETA(distanceKm) {
    if (!distanceKm || distanceKm <= 0) return 1;
    const speedKmPerHour = 20;
    const timeHours = distanceKm / speedKmPerHour;
    const timeMinutes = Math.round(timeHours * 60);
    return Math.max(1, timeMinutes); // At least 1 minute
}

function ETAPanel({ shuttle, isActive }) {
    // Use server-provided next stop (direction-aware) or fall back to nearest
    const nextStop = shuttle?.nextStop || null;
    const distanceToNextStop = shuttle?.distanceToNextStop || null;
    const position = shuttle?.position || null;

    // Calculate ETA to next stop
    const eta = distanceToNextStop ? estimateETA(distanceToNextStop) : null;

    if (!isActive) {
        return (
            <div className="eta-panel inactive">
                <div className="eta-icon">🚌</div>
                <div className="eta-content">
                    <div className="eta-label">Shuttle Status</div>
                    <div className="eta-value">Not Active</div>
                    <div className="eta-subtitle">Waiting for driver to start</div>
                </div>
            </div>
        );
    }

    if (!position) {
        return (
            <div className="eta-panel connecting">
                <div className="eta-icon">📡</div>
                <div className="eta-content">
                    <div className="eta-label">Shuttle Status</div>
                    <div className="eta-value">Connecting...</div>
                    <div className="eta-subtitle">Waiting for location data</div>
                </div>
            </div>
        );
    }

    return (
        <div className="eta-panel active">
            <div className="eta-icon">🚌</div>
            <div className="eta-content">
                <div className="eta-label">Next Stop</div>
                <div className="eta-value">{nextStop?.name || 'Unknown'}</div>
                <div className="eta-time">
                    <span className="eta-minutes">~{eta || '?'}</span>
                    <span className="eta-unit">min</span>
                </div>
            </div>
            <div className="eta-live-badge">
                <span className="live-dot"></span>
                LIVE
            </div>
        </div>
    );
}

export default ETAPanel;
