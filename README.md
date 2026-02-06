# Axis 🚌

Real-time campus shuttle tracker for Legon.

## Quick Start

### 1. Server
```bash
cd server
npm install
npm run dev
```
Runs on `http://localhost:3001`

### 2. Passenger App
```bash
cd passenger-app
npm install
npm run dev
```
Create `.env` with your Mapbox token:
```
VITE_MAPBOX_ACCESS_TOKEN=your_token_here
```

### 3. Driver App
Open `driver-app/index.html` in a browser.  
Update `MAPBOX_TOKEN` in `app.js` with your token.

## Features

- **Real-time tracking** via WebSockets
- **Driver app** - share location with passengers
- **Passenger app** - see shuttle on map with ETA
- **Light/dark mode** (persists in localStorage)
- **iOS-style UI**

## Tech Stack

- **Server:** Node.js, Express, Socket.io
- **Passenger:** Vite + React, Mapbox GL
- **Driver:** Vanilla JS, Mapbox GL
