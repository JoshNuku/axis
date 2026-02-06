import { useState, useEffect, useCallback } from 'react';

function Notification({ notification, onDismiss }) {
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                onDismiss();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [notification, onDismiss]);

    if (!notification) return null;

    return (
        <div className={`notification ${notification ? 'show' : ''}`}>
            <div className="notification-icon">🚌</div>
            <div className="notification-content">
                <div className="notification-title">{notification.title}</div>
                <div className="notification-body">{notification.body}</div>
            </div>
        </div>
    );
}

export function useNotifications(shuttlePosition, isActive, nearestStopName) {
    const [notification, setNotification] = useState(null);
    const [lastNotifiedStop, setLastNotifiedStop] = useState(null);

    // Request browser notification permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Show notification when shuttle is near a stop
    useEffect(() => {
        if (!isActive || !nearestStopName) return;
        if (nearestStopName === lastNotifiedStop) return;

        // Show in-app notification
        setNotification({
            title: 'Shuttle Approaching',
            body: `Arriving at ${nearestStopName} soon`
        });
        setLastNotifiedStop(nearestStopName);

        // Also try browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Axis Shuttle', {
                body: `Arriving at ${nearestStopName} soon`,
                icon: '🚌'
            });
        }
    }, [nearestStopName, isActive, lastNotifiedStop]);

    // Reset when shuttle becomes inactive
    useEffect(() => {
        if (!isActive) {
            setLastNotifiedStop(null);
        }
    }, [isActive]);

    const dismissNotification = useCallback(() => {
        setNotification(null);
    }, []);

    return { notification, dismissNotification };
}

export default Notification;
