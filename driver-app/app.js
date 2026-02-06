// Configuration loaded from config.js (fetched from server)
let SERVER_URL = CONFIG.SERVER_URL;
let MAPBOX_TOKEN = null;

// DOM Elements
const connectionStatus = document.getElementById('connectionStatus');
const statusText = connectionStatus.querySelector('.status-text');
const coordinatesEl = document.getElementById('coordinates');
const accuracyEl = document.getElementById('accuracy');
const shareBtn = document.getElementById('shareBtn');
const infoPanel = document.getElementById('infoPanel');
const themeToggle = document.getElementById('themeToggle');

// State
let isSharing = false;
let watchId = null;
let socket = null;
let currentPosition = null;
let map = null;
let marker = null;
let shuttleId = null; // Assigned by server
let isDarkMode = localStorage.getItem('axis-theme') !== 'light';

// Apply stored theme on load
if (!isDarkMode) {
    document.body.classList.add('light');
    themeToggle.textContent = '🌙';
}

// Theme toggle
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light', !isDarkMode);
    themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
    localStorage.setItem('axis-theme', isDarkMode ? 'dark' : 'light');

    if (map) {
        const style = isDarkMode
            ? 'mapbox://styles/mapbox/navigation-night-v1'
            : 'mapbox://styles/mapbox/navigation-day-v1';
        map.setStyle(style);
    }
}

themeToggle.addEventListener('click', toggleTheme);

// Initialize mini-map
function initMap(lat, lng) {
    if (map) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map = new mapboxgl.Map({
        container: 'miniMap',
        style: isDarkMode
            ? 'mapbox://styles/mapbox/navigation-night-v1'
            : 'mapbox://styles/mapbox/navigation-day-v1',
        center: [lng, lat],
        zoom: 16
    });

    const el = document.createElement('div');
    el.innerHTML = '🚌';
    el.style.fontSize = '28px';

    marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map);
}

// Update map marker
function updateMapMarker(lat, lng) {
    if (!map) {
        initMap(lat, lng);
        return;
    }

    marker.setLngLat([lng, lat]);
    map.easeTo({ center: [lng, lat], duration: 500 });
}

// Initialize Socket.io connection
function initSocket() {
    socket = io(SERVER_URL);

    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('driver:register'); // Server will assign ID
        connectionStatus.classList.add('connected');
        statusText.textContent = 'Connected';
    });

    // Server assigns shuttle ID
    socket.on('driver:assigned', (id) => {
        shuttleId = id;
        console.log(`Assigned Shuttle ${id}`);
        shareBtn.disabled = false;
        infoPanel.innerHTML = `<p>You are Shuttle ${id}. Tap to start sharing.</p>`;
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        connectionStatus.classList.remove('connected', 'sharing');
        statusText.textContent = 'Disconnected';
        shareBtn.disabled = true;
        shuttleId = null;
        stopSharing();
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        statusText.textContent = 'Connection failed';
    });
}

// Start watching position
function startSharing() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by this browser.');
        return;
    }

    if (!shuttleId) {
        alert('Not assigned a shuttle ID yet. Please wait.');
        return;
    }

    isSharing = true;
    socket.emit('driver:start');

    shareBtn.classList.add('active');
    shareBtn.querySelector('.btn-text').textContent = 'Stop Sharing';
    connectionStatus.classList.add('sharing');
    statusText.textContent = `Shuttle ${shuttleId}`;
    infoPanel.classList.add('sharing');
    infoPanel.innerHTML = `<p>Broadcasting as Shuttle ${shuttleId}</p>`;

    watchId = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            currentPosition = { lat: latitude, lng: longitude };

            coordinatesEl.innerHTML = `
        <span class="coord-lat">${latitude.toFixed(6)}</span>
        <span class="coord-lng">${longitude.toFixed(6)}</span>
      `;
            accuracyEl.textContent = `±${Math.round(accuracy)}m`;

            updateMapMarker(latitude, longitude);

            socket.emit('driver:location', currentPosition);
        },
        (error) => {
            console.error('Geolocation error:', error);
            let errorMsg = 'Location error';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMsg = 'Permission denied';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMsg = 'Location unavailable';
                    break;
                case error.TIMEOUT:
                    errorMsg = 'Request timed out';
                    break;
            }
            coordinatesEl.innerHTML = `<span class="coord-waiting">${errorMsg}</span>`;
            stopSharing();
        },
        {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 10000
        }
    );
}

// Stop sharing location
function stopSharing() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    isSharing = false;

    if (socket && socket.connected) {
        socket.emit('driver:stop');
    }

    shareBtn.classList.remove('active');
    shareBtn.querySelector('.btn-text').textContent = 'Start Sharing';
    connectionStatus.classList.remove('sharing');
    if (socket && socket.connected) {
        statusText.textContent = 'Connected';
    }
    infoPanel.classList.remove('sharing');
    infoPanel.innerHTML = `<p>Tap the button to start sharing your location.</p>`;
}

// Toggle sharing
shareBtn.addEventListener('click', () => {
    if (isSharing) {
        stopSharing();
    } else {
        startSharing();
    }
});

// Initialize app after config loads
async function init() {
    const loaded = await loadConfig();
    if (loaded) {
        MAPBOX_TOKEN = CONFIG.MAPBOX_TOKEN;
    }
    initMap(5.6475, -0.1855);
    initSocket();
}

init();
