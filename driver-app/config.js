// Driver App Configuration
// Fetched from server at runtime - no secrets in this file

let CONFIG = {
    SERVER_URL: 'http://localhost:3001',
    MAPBOX_TOKEN: null
};

let configLoaded = false;

// Fetch config from server
async function loadConfig() {
    try {
        const res = await fetch(`${CONFIG.SERVER_URL}/api/config`);
        const data = await res.json();
        CONFIG.MAPBOX_TOKEN = data.MAPBOX_TOKEN;
        configLoaded = true;
        console.log('Config loaded from server');
        return true;
    } catch (err) {
        console.error('Failed to load config:', err);
        return false;
    }
}
