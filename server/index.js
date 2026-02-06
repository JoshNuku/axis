const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { legonStops, defaultRoute } = require('./routes');

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
        MAPBOX_TOKEN: process.env.MAPBOX_TOKEN || 'pk.eyJ1Ijoiam9zaDExOSIsImEiOiJjbHhqOHhkd2IxdTQ5MmtzaWdyM2JpczlwIn0.J04XlsjDCtkSuBf4cbXx7A'
    });
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
        shuttles.set(id, {
            ...shuttle,
            position: { lat, lng },
            isActive: true,
            lastUpdate: new Date().toISOString()
        });

        io.emit('shuttle:update', {
            id,
            lat,
            lng,
            isActive: true,
            timestamp: new Date().toISOString()
        });

        console.log(`Shuttle ${id} at ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
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
        shuttles.delete(driverShuttleId);
        io.emit('shuttle:active', { id: driverShuttleId, isActive: false });
        console.log(`Shuttle ${driverShuttleId} stopped`);
        driverShuttleId = null;
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
