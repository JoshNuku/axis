import { useEffect, useMemo } from 'react';
import legonStops from '../data/legonStops';

// Haversine formula to calculate distance between two points
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
    const speedKmPerHour = 20;
    const timeHours = distanceKm / speedKmPerHour;
    const timeMinutes = Math.round(timeHours * 60);
    return Math.max(1, timeMinutes); // At least 1 minute
}

function ETAPanel({ shuttlePosition, isActive }) {
    const nearestStop = useMemo(() => {
        if (!shuttlePosition || !isActive) return null;

        let nearest = null;
        let minDistance = Infinity;

        for (const stop of legonStops) {
            const distance = getDistanceKm(
                shuttlePosition.lat,
                shuttlePosition.lng,
                stop.coordinates[1], // lat
                stop.coordinates[0]  // lng
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearest = { ...stop, distance, eta: estimateETA(distance) };
            }
        }

        return nearest;
    }, [shuttlePosition, isActive]);

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

    if (!shuttlePosition) {
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
                <div className="eta-value">{nearestStop?.name || 'Unknown'}</div>
                <div className="eta-time">
                    <span className="eta-minutes">~{nearestStop?.eta || '?'}</span>
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
