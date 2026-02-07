import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import legonStops from '../data/legonStops';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

// Decode Google's encoded polyline to array of [lng, lat] coordinates
function decodePolyline(encoded) {
    const points = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        points.push([lng / 1e5, lat / 1e5]); // [lng, lat] for Mapbox
    }
    return points;
}

// Fetch route via server proxy (to avoid CORS issues with Google Directions API)
async function fetchGoogleRoute(startLng, startLat, endLng, endLat) {
    try {
        const origin = `${startLat},${startLng}`;
        const destination = `${endLat},${endLng}`;
        const url = `${SERVER_URL}/api/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;

        console.log('Fetching directions from:', url);
        const response = await fetch(url);
        const data = await response.json();
        console.log('Directions API response:', data);

        if (data.routes && data.routes.length > 0) {
            const encodedPolyline = data.routes[0].overview_polyline.points;
            const coords = decodePolyline(encodedPolyline);
            console.log('Decoded route coordinates:', coords.length, 'points');
            return coords;
        } else {
            console.log('No routes in response, using straight line');
        }
    } catch (err) {
        console.error('Error fetching route:', err);
    }
    // Fallback to straight line
    console.log('Using fallback straight line');
    return [[startLng, startLat], [endLng, endLat]];
}

// Helper to find the nearest stop to a position
function findNearestStop(position) {
    if (!position) return null;
    let nearest = null;
    let minDist = Infinity;

    legonStops.forEach(stop => {
        const dx = stop.coordinates[0] - position.lng;
        const dy = stop.coordinates[1] - position.lat;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
            minDist = dist;
            nearest = stop;
        }
    });
    return nearest;
}

// Helper to interpolate between two positions
function lerp(start, end, t) {
    return start + (end - start) * t;
}


function ShuttleMap({ shuttles = [], isDarkMode = true }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const shuttleMarkers = useRef({}); // Map of shuttle ID -> { marker, currentPos, targetPos, animationFrame }
    const routeLineAdded = useRef(false);

    // Route caching - only fetch new route when destination stop changes
    const cachedRouteStop = useRef(null);
    const cachedRouteCoords = useRef(null);

    const [mapLoaded, setMapLoaded] = useState(false);

    const mapStyle = isDarkMode
        ? 'mapbox://styles/mapbox/navigation-night-v1'
        : 'mapbox://styles/mapbox/navigation-day-v1';

    // Update route line from bus to nearest stop (with caching to reduce API calls)
    const updateRouteLine = useCallback(async (position) => {
        if (!map.current || !mapLoaded) return;

        try {
            const nearestStop = findNearestStop(position);
            if (!nearestStop || !position) {
                if (map.current.getSource('route-line')) {
                    map.current.getSource('route-line').setData({
                        type: 'Feature',
                        geometry: { type: 'LineString', coordinates: [] }
                    });
                }
                cachedRouteStop.current = null;
                cachedRouteCoords.current = null;
                return;
            }

            let routeCoordinates;

            // Only fetch new route if destination stop changed
            if (cachedRouteStop.current !== nearestStop.id) {
                console.log(`Fetching route to ${nearestStop.name} (new destination)`);
                routeCoordinates = await fetchGoogleRoute(
                    position.lng, position.lat,
                    nearestStop.coordinates[0], nearestStop.coordinates[1]
                );
                cachedRouteStop.current = nearestStop.id;
                cachedRouteCoords.current = routeCoordinates;
            } else if (cachedRouteCoords.current && cachedRouteCoords.current.length > 1) {
                // Use cached route but update start point to current position
                routeCoordinates = [[position.lng, position.lat], ...cachedRouteCoords.current.slice(1)];
            } else {
                // Fallback to straight line if no valid cache
                routeCoordinates = [
                    [position.lng, position.lat],
                    nearestStop.coordinates
                ];
            }

            const lineData = {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: routeCoordinates
                }
            };

            const source = map.current.getSource('route-line');
            if (source) {
                source.setData(lineData);
            }
        } catch (err) {
            console.log('Error updating route line:', err);
        }
    }, [mapLoaded]);

    // Animate shuttle marker smoothly to new position
    const animateShuttle = useCallback((id, targetLng, targetLat) => {
        const shuttle = shuttleMarkers.current[id];
        if (!shuttle) return;

        // Cancel any existing animation
        if (shuttle.animationFrame) {
            cancelAnimationFrame(shuttle.animationFrame);
        }

        const startPos = shuttle.currentPos || { lng: targetLng, lat: targetLat };
        const startTime = performance.now();
        const duration = 800; // Smooth 800ms animation

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic for smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 3);

            const currentLng = lerp(startPos.lng, targetLng, eased);
            const currentLat = lerp(startPos.lat, targetLat, eased);

            shuttle.marker.setLngLat([currentLng, currentLat]);
            shuttle.currentPos = { lng: currentLng, lat: currentLat };

            // Update route line to follow the animated position
            updateRouteLine(shuttle.currentPos);

            if (progress < 1) {
                shuttle.animationFrame = requestAnimationFrame(animate);
            } else {
                shuttle.animationFrame = null;
            }
        };

        shuttle.animationFrame = requestAnimationFrame(animate);
    }, [updateRouteLine]);

    // Initialize map
    useEffect(() => {
        if (map.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: mapStyle,
            center: [-0.1855, 5.6475],
            zoom: 15,
            pitch: 45,
            bearing: -17.6
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.current.on('load', () => {
            setMapLoaded(true);

            // Add the route line source and layer
            map.current.addSource('route-line', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: [] }
                }
            });

            // Glow effect layer (behind)
            map.current.addLayer({
                id: 'route-line-glow',
                type: 'line',
                source: 'route-line',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#007aff',
                    'line-width': 12,
                    'line-opacity': 0.3,
                    'line-blur': 3
                }
            });

            // Main line layer
            map.current.addLayer({
                id: 'route-line-main',
                type: 'line',
                source: 'route-line',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#007aff',
                    'line-width': 5,
                    'line-opacity': 0.9
                }
            });

            // Animated dashed overlay
            map.current.addLayer({
                id: 'route-line-dash',
                type: 'line',
                source: 'route-line',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#ffffff',
                    'line-width': 2,
                    'line-dasharray': [2, 4],
                    'line-opacity': 0.8
                }
            });

            routeLineAdded.current = true;

            // Add stop markers
            legonStops.forEach(stop => {
                const el = document.createElement('div');
                el.className = 'stop-marker';
                el.innerHTML = `
          <div class="stop-pin"></div>
          <div class="stop-marker-label">${stop.name}</div>
        `;

                new mapboxgl.Marker(el)
                    .setLngLat(stop.coordinates)
                    .addTo(map.current);
            });
        });

        // Re-add layers after style change
        map.current.on('style.load', () => {
            if (!routeLineAdded.current) return;

            if (!map.current.getSource('route-line')) {
                map.current.addSource('route-line', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        geometry: { type: 'LineString', coordinates: [] }
                    }
                });

                map.current.addLayer({
                    id: 'route-line-glow',
                    type: 'line',
                    source: 'route-line',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': '#007aff',
                        'line-width': 12,
                        'line-opacity': 0.3,
                        'line-blur': 3
                    }
                });

                map.current.addLayer({
                    id: 'route-line-main',
                    type: 'line',
                    source: 'route-line',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': '#007aff',
                        'line-width': 5,
                        'line-opacity': 0.9
                    }
                });

                map.current.addLayer({
                    id: 'route-line-dash',
                    type: 'line',
                    source: 'route-line',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': '#ffffff',
                        'line-width': 2,
                        'line-dasharray': [2, 4],
                        'line-opacity': 0.8
                    }
                });
            }
        });

        return () => {
            // Cancel all animations on cleanup
            Object.values(shuttleMarkers.current).forEach(shuttle => {
                if (shuttle.animationFrame) {
                    cancelAnimationFrame(shuttle.animationFrame);
                }
            });
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    // Update map style
    useEffect(() => {
        if (map.current && mapLoaded) {
            map.current.setStyle(mapStyle);
        }
    }, [isDarkMode, mapStyle, mapLoaded]);

    // Update shuttle markers with smooth animation
    useEffect(() => {
        if (!mapLoaded || !map.current) return;

        // Track which shuttles we've seen this update
        const seenIds = new Set();

        // Update or create markers for each shuttle
        shuttles.forEach(shuttle => {
            const { id, position } = shuttle;
            if (!position) return;

            seenIds.add(id);

            if (shuttleMarkers.current[id]) {
                // Animate existing marker to new position
                animateShuttle(id, position.lng, position.lat);
            } else {
                // Create new marker
                const el = document.createElement('div');
                el.className = 'shuttle-marker animated';
                el.innerHTML = `
          <div class="shuttle-label">Shuttle ${id}</div>
          <div class="shuttle-icon">🚌</div>
        `;

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([position.lng, position.lat])
                    .addTo(map.current);

                shuttleMarkers.current[id] = {
                    marker,
                    currentPos: { lng: position.lng, lat: position.lat },
                    targetPos: { lng: position.lng, lat: position.lat },
                    animationFrame: null
                };
            }
        });

        // Always update route line for the first shuttle (outside the loop to avoid race conditions)
        if (shuttles.length > 0 && shuttles[0].position) {
            updateRouteLine(shuttles[0].position);
        }

        // Remove markers for shuttles that are no longer active
        Object.keys(shuttleMarkers.current).forEach(id => {
            if (!seenIds.has(id)) {
                const shuttle = shuttleMarkers.current[id];
                if (shuttle.animationFrame) {
                    cancelAnimationFrame(shuttle.animationFrame);
                }
                shuttle.marker.remove();
                delete shuttleMarkers.current[id];
            }
        });

        // Clear route line if no shuttles
        if (shuttles.length === 0) {
            updateRouteLine(null);
        }

        // Pan to first shuttle if any
        if (shuttles.length > 0 && shuttles[0].position) {
            const pos = shuttles[0].position;
            map.current.easeTo({
                center: [pos.lng, pos.lat],
                duration: 1000
            });
        }
    }, [shuttles, mapLoaded, animateShuttle, updateRouteLine]);

    return (
        <div className="map-wrapper">
            <div ref={mapContainer} className="map-container" />
            {!mapLoaded && (
                <div className="map-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading map...</p>
                </div>
            )}
        </div>
    );
}

export default ShuttleMap;
