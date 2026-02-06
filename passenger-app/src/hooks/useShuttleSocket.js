import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = process.env.VITE_SERVER_URL;

export function useShuttleSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const [shuttles, setShuttles] = useState({}); // Map of shuttle ID -> shuttle data
    const socketRef = useRef(null);

    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;

        const socket = io(SERVER_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to shuttle server');
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from shuttle server');
            setIsConnected(false);
            setShuttles({});
        });

        // Initial state with all active shuttles
        socket.on('shuttles:state', (activeShuttles) => {
            const shuttleMap = {};
            activeShuttles.forEach(s => {
                if (s.isActive && s.position) {
                    shuttleMap[s.id] = s;
                }
            });
            setShuttles(shuttleMap);
        });

        // Individual shuttle update
        socket.on('shuttle:update', (data) => {
            const { id, lat, lng, isActive } = data;
            if (isActive && lat && lng) {
                setShuttles(prev => ({
                    ...prev,
                    [id]: { id, position: { lat, lng }, isActive }
                }));
            }
        });

        // Shuttle active status change
        socket.on('shuttle:active', ({ id, isActive }) => {
            if (!isActive) {
                setShuttles(prev => {
                    const updated = { ...prev };
                    delete updated[id];
                    return updated;
                });
            }
        });
    }, []);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    }, []);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    // Convert to array for components, also provide legacy single-shuttle interface
    const shuttleArray = Object.values(shuttles);
    const hasActiveShuttles = shuttleArray.length > 0;

    return {
        isConnected,
        shuttles: shuttleArray,
        hasActiveShuttles,
        // Legacy interface for single shuttle (first active)
        shuttlePosition: shuttleArray[0]?.position || null,
        isShuttleActive: hasActiveShuttles,
        reconnect: connect
    };
}
