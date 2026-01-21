import React, { useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const LocationTracker: React.FC = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const sendLocation = () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            await api.post('/employees/location', { lat: latitude, lng: longitude });
            console.log('Location updated:', latitude, longitude);
          } catch (error) {
            console.error('Failed to update location:', error);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    // Send immediately on mount
    sendLocation();

    // Send every 5 minutes (300000 ms)
    const intervalId = setInterval(sendLocation, 300000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated]);

  return null; // This component doesn't render anything
};

export default LocationTracker;
