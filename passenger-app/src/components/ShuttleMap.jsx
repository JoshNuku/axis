import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import legonStops from '../data/legonStops';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

function ShuttleMap({ shuttles = [], isDarkMode = true }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const shuttleMarkers = useRef({}); // Map of shuttle ID -> marker
    const [mapLoaded, setMapLoaded] = useState(false);

    const mapStyle = isDarkMode
        ? 'mapbox://styles/mapbox/navigation-night-v1'
        : 'mapbox://styles/mapbox/navigation-day-v1';

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

        return () => {
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

    // Update shuttle markers
    useEffect(() => {
        if (!mapLoaded || !map.current) return;

        // Track which shuttles we've seen this update
        const seenIds = new Set();

        // Update or create markers for each shuttle
        shuttles.forEach(shuttle => {
            const { id, position } = shuttle;
            if (!position) return;

            seenIds.add(id);
            const lngLat = [position.lng, position.lat];

            if (shuttleMarkers.current[id]) {
                // Update existing marker
                shuttleMarkers.current[id].setLngLat(lngLat);
            } else {
                // Create new marker
                const el = document.createElement('div');
                el.className = 'shuttle-marker';
                el.innerHTML = `
          <div class="shuttle-label">Shuttle ${id}</div>
          <div class="shuttle-icon">🚌</div>
        `;

                const marker = new mapboxgl.Marker(el)
                    .setLngLat(lngLat)
                    .addTo(map.current);

                shuttleMarkers.current[id] = marker;
            }
        });

        // Remove markers for shuttles that are no longer active
        Object.keys(shuttleMarkers.current).forEach(id => {
            if (!seenIds.has(id)) {
                shuttleMarkers.current[id].remove();
                delete shuttleMarkers.current[id];
            }
        });

        // Pan to first shuttle if any
        if (shuttles.length > 0 && shuttles[0].position) {
            const pos = shuttles[0].position;
            map.current.easeTo({
                center: [pos.lng, pos.lat],
                duration: 1000
            });
        }
    }, [shuttles, mapLoaded]);

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
