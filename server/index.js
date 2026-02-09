const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { legonStops, defaultRoute, calculateBearing, getNextStopInDirection, getDistanceKm } = require('./routes');
require('dotenv').config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

// Track shuttles by ID
const shuttles = new Map();

// Get next available shuttle ID (1, 2, 3, ...)
function getNextShuttleId() {
    let id = 1;
    while (shuttles.has(String(id))) {
        id++;
    }
    return String(id);
}

// REST endpoints
app.get('/api/stops', (req, res) => {
    res.json(legonStops);
});

app.get('/api/route', (req, res) => {
    res.json(defaultRoute);
});

app.get('/api/shuttles', (req, res) => {
    const activeShuttles = Array.from(shuttles.values()).filter(s => s.isActive);
    res.json(activeShuttles);
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', activeShuttles: shuttles.size });
});

// Config endpoint for driver app (secrets from env)
app.get('/api/config', (req, res) => {
    res.json({
        MAPBOX_TOKEN: process.env.MAPBOX_TOKEN
    });
});

// Google Directions API proxy (handles CORS for frontend)
app.get('/api/directions', async (req, res) => {
    try {
        const { origin, destination } = req.query;

        if (!origin || !destination) {
            return res.status(400).json({ error: 'origin and destination are required' });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
            return res.status(500).json({ error: 'Google Maps API key not configured' });
        }

        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        res.json(data);
    } catch (err) {
        console.error('Directions API error:', err);
        res.status(500).json({ error: 'Failed to fetch directions' });
    }
});

// Socket.io handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    let driverShuttleId = null;

    // Send current shuttles to new connections
    const activeShuttles = Array.from(shuttles.values()).filter(s => s.isActive);
    socket.emit('shuttles:state', activeShuttles);
    socket.emit('stops:data', legonStops);

    // Driver registers and gets assigned an ID
    socket.on('driver:register', () => {
        driverShuttleId = getNextShuttleId();
        shuttles.set(driverShuttleId, {
            id: driverShuttleId,
            position: null,
            isActive: false,
            socketId: socket.id,
            lastUpdate: null
        });
        // Send the assigned ID back to driver
        socket.emit('driver:assigned', driverShuttleId);
        console.log(`Driver assigned Shuttle ${driverShuttleId}`);
    });

    // Driver sends location
    socket.on('driver:location', (data) => {
        const { lat, lng } = data;
        const id = driverShuttleId;
        if (!id) return;

        const shuttle = shuttles.get(id) || { id, isActive: true };
        const prevPosition = shuttle.position;

        // Calculate heading from previous position
        let heading = shuttle.heading || 0;
        if (prevPosition && (prevPosition.lat !== lat || prevPosition.lng !== lng)) {
            heading = calculateBearing(prevPosition.lat, prevPosition.lng, lat, lng);
        }

        // Get next stop based on position and heading
        const nextStop = getNextStopInDirection(lat, lng, heading);
        const distanceToNextStop = nextStop
            ? getDistanceKm(lat, lng, nextStop.coordinates[0], nextStop.coordinates[1])
            : null;

        shuttles.set(id, {
            ...shuttle,
            position: { lat, lng },
            heading,
            nextStop: nextStop ? { id: nextStop.id, name: nextStop.name, coordinates: nextStop.coordinates } : null,
            distanceToNextStop,
            isActive: true,
            lastUpdate: new Date().toISOString()
        });

        io.emit('shuttle:update', {
            id,
            lat,
            lng,
            heading,
            nextStop: nextStop ? { id: nextStop.id, name: nextStop.name, coordinates: nextStop.coordinates } : null,
            distanceToNextStop,
            isActive: true,
            timestamp: new Date().toISOString()
        });

        console.log(`Shuttle ${id} at ${lat.toFixed(5)}, ${lng.toFixed(5)} heading ${heading.toFixed(0)}° -> ${nextStop?.name || 'unknown'}`);
    });

    // Driver starts
    socket.on('driver:start', () => {
        if (!driverShuttleId) return;
        const shuttle = shuttles.get(driverShuttleId) || { id: driverShuttleId };
        shuttles.set(driverShuttleId, { ...shuttle, isActive: true });
        io.emit('shuttle:active', { id: driverShuttleId, isActive: true });
        console.log(`Shuttle ${driverShuttleId} started`);
    });

    // Driver stops
    socket.on('driver:stop', () => {
        if (!driverShuttleId) return;
        const shuttle = shuttles.get(driverShuttleId);
        if (shuttle) {
            // Mark as inactive but preserve the shuttle entry
            shuttles.set(driverShuttleId, { ...shuttle, isActive: false, position: null });
        }
        io.emit('shuttle:active', { id: driverShuttleId, isActive: false });
        console.log(`Shuttle ${driverShuttleId} stopped (paused)`);
        // Don't null the driverShuttleId - allow restart on same connection
    });

    socket.on('disconnect', () => {
        if (driverShuttleId) {
            shuttles.delete(driverShuttleId);
            io.emit('shuttle:active', { id: driverShuttleId, isActive: false });
            console.log(`Shuttle ${driverShuttleId} disconnected`);
        }
        console.log(`Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`🚌 Axis server on http://localhost:${PORT}`);
});
