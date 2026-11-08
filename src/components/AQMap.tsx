import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { formatPM25 } from '@/utils/aqiUtils';
import { X, LocateFixed } from 'lucide-react';
import L from 'leaflet';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { Crosshair } from 'lucide-react';
import { useSensors } from '@/hooks/useSensors';



// Fix for default marker icons in Leaflet with React
(L.Icon.Default.prototype as any)._getIconUrl = undefined;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 42px; opacity: 0.8; height: 42px; border-radius: 50%; box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.7), 0 0 0 5px ${color}30; display: flex; align-items: center; justify-content: center;"></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
};

const getRandomOffset = (range: number): number => {
  return (Math.random() * 2 - 1) * range;
};

const FitBounds = ({ sensors }: { sensors: any[] }) => {
  const map = useMap();

  useEffect(() => {
    if (sensors.length > 0) {
      const bounds = L.latLngBounds(
        sensors.map((sensor) => [
          sensor.location.lat + getRandomOffset(0.0005),
          sensor.location.lng + getRandomOffset(0.0005),
        ])
      );
      if (bounds.isValid()) {
  map.fitBounds(bounds, {
    paddingTopLeft: [50, 50],
    paddingBottomRight: [150, 100], // Prevent overlap with legend/buttons
  });
}

    }
  }, [map, sensors]);

  return null;
};

const CurrentLocationButton = () => {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);
  const [userLocationMarker, setUserLocationMarker] = useState<L.Marker | null>(null);

  const handleLocate = useCallback(() => {
    setIsLocating(true);
    
    // First check if geolocation is supported
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }

    // Request high accuracy position
    const options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latlng = L.latLng(latitude, longitude);
        map.flyTo(latlng, 15);

        if (userLocationMarker) {
          userLocationMarker.remove();
        }

        const newUserMarker = L.marker(latlng, {
          icon: L.divIcon({
            className: 'user-location-icon',
            html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px #3b82f6;"></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          })
        }).addTo(map).bindPopup("You are here!").openPopup();
        setUserLocationMarker(newUserMarker);
        setIsLocating(false);
      },
      (error) => {
        let errorMessage = "Could not access your location.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location services in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        alert(errorMessage);
        setIsLocating(false);
      },
      options
    );
  }, [map, userLocationMarker]);

  return (
    <button
      onClick={handleLocate}
      disabled={isLocating}
      className="absolute top-4 right-4 z-[1000] bg-white dark:bg-gray-800 p-2.5 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
      title="Show my location"
      aria-label="Show my location"
    >
      {isLocating ? (
        <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <LocateFixed className="h-5 w-5 text-gray-700 dark:text-gray-200" />
      )}
    </button>
  );
};

const RecenterButton = ({ sensors }: { sensors: any[] }) => {
  const map = useMap();

  const handleRecenter = () => {
    if (sensors.length > 0) {
      const bounds = L.latLngBounds(
        sensors.map(sensor => [
          sensor.location.lat + getRandomOffset(0.0005),
          sensor.location.lng + getRandomOffset(0.0005)
        ])
      );
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  };

  return (
    <button
      onClick={handleRecenter}
      className="absolute top-16 right-4 z-[1000] bg-white dark:bg-gray-800 p-2.5 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      title="Recenter to show all sensors"
      aria-label="Recenter map to all sensors"
    >
      <Crosshair className="h-5 w-5 text-gray-700 dark:text-gray-200" />
    </button>
  );
};

const HeatmapLayer = ({ sensors, visible }: { sensors: any[]; visible: boolean }) => {
  const map = useMap();

  useEffect(() => {
    if (!visible || sensors.length === 0) {
      // Remove existing heat layer
      map.eachLayer((layer: any) => {
        if (layer._heat) map.removeLayer(layer);
      });
      return;
    }

    // Remove old heat layer first
    map.eachLayer((layer: any) => {
      if (layer._heat) map.removeLayer(layer);
    });

    const heatData: [number, number, number][] = sensors.map((s: any) => [
      s.location.lat,
      s.location.lng,
      Math.min(s.pm25 / 30, 1), // normalize intensity
    ]);

    const heat = (L as any).heatLayer(heatData, {
      radius: 45,
      blur: 35,
      maxZoom: 15,
      gradient: {
        0.0: '#4ade80',
        0.3: '#facc15',
        0.5: '#fb923c',
        0.7: '#f87171',
        0.9: '#c084fc',
        1.0: '#ef4444',
      },
    });

    heat.addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, sensors, visible]);

  return null;
};

const AQMap = () => {
  const navigate = useNavigate();
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const { data: sensors = [], isLoading, error } = useSensors();
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [mapStyle, setMapStyle] = useState<'light' | 'dark' | 'satellite'>(
    () => document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  // Sync map style with dark mode toggle
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setMapStyle(prev => prev === 'satellite' ? prev : isDark ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const tileUrls: Record<string, { url: string; attribution: string }> = {
    light: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    dark: {
      url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri',
    },
  };

  if (error && isLoading) {
    return (
      <div className="relative w-full h-full rounded-xl shadow-sm overflow-hidden flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-600 p-4 bg-red-100 rounded-lg">
          <h2 className="text-lg font-semibold">Error loading map data</h2>
          <p className="mt-1 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="relative w-full h-full rounded-xl shadow-sm overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-xl shadow-sm overflow-hidden">
      <MapContainer
        center={[39.9612, -82.9988]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
        ref={(map) => setMapInstance(map)}
      >
        <TileLayer
          key={mapStyle}
          attribution={tileUrls[mapStyle].attribution}
          url={tileUrls[mapStyle].url}
        />

        <CurrentLocationButton />

    <RecenterButton sensors={sensors} />


        {sensors.length > 0 && <FitBounds sensors={sensors} />}

        <HeatmapLayer sensors={sensors} visible={showHeatmap} />

        {showMarkers && sensors.map((sensor) => {
          const position: [number, number] = [
            sensor.location.lat + getRandomOffset(0.0005),
            sensor.location.lng + getRandomOffset(0.0005)
          ];

          return (
            <Marker
              key={sensor.id}
              position={position}
              icon={createColoredIcon(sensor.aqiCategory?.color || '#9ca3af')}
              eventHandlers={{
                click: (e) => {
  const map = e.target._map as L.Map;
  const marker = e.target as L.Marker;
  const latlng = marker.getLatLng();
  setSelectedSensor(sensor.id);

  const offsetLatLng = L.latLng(latlng.lat + 0.0015, latlng.lng); // Offset upward

  if (map.getZoom() < 15) {
    map.flyTo(offsetLatLng, 15, { animate: true, duration: 0.5 });
    map.once('zoomend moveend', () => {
      if (marker.getPopup() && !marker.isPopupOpen()) marker.openPopup();
    });
  } else {
    map.panTo(offsetLatLng, { animate: true });
    if (marker.getPopup() && !marker.isPopupOpen()) marker.openPopup();
  }
}
,
              }}
            >
              <Popup>
                <div className="p-1 w-56"> {/* Increased width slightly for better spacing */}
                  <button
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 transition-colors z-[1]" // Ensure button is clickable
                    onClick={(ev) => {
                      ev.stopPropagation();
                      if (mapInstance) mapInstance.closePopup();
                      setSelectedSensor(null);
                    }}
                    aria-label="Close popup"
                  >
                 
                  </button>

                  <div className="font-semibold text-base mb-1 pr-5">{sensor.name}</div>

                  <div
                    className="text-xs inline-block px-2 py-1 rounded-full my-1.5 font-medium"
                    style={{
                      backgroundColor: `${sensor.aqiCategory?.color || '#e5e7eb'}33`,
                      color: sensor.aqiCategory?.color || '#4b5563'
                    }}
                  >
                    {sensor.aqiCategory?.category || 'N/A'}
                  </div>

                  <div className="space-y-1.5 text-xs mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">PM2.5:</span>
                      <span className="font-semibold">{formatPM25(sensor.pm25)} µg/m³</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Temperature:</span>
                      <span className="font-semibold">{sensor.temperature?.toFixed(1) ?? 'N/A'} °C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Humidity:</span>
                      <span className="font-semibold">{sensor.humidity?.toFixed(0) ?? 'N/A'}%</span>
                    </div>

                    <div className="flex justify-between pt-1 border-t border-gray-200 mt-1.5">
                      <span className="text-gray-500 text-xs">Last Updated:</span>
                      <span className="font-medium text-xs">
                        {sensor.lastUpdated ? new Date(sensor.lastUpdated + 'Z').toLocaleString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        }) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  className="mt-3 w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 rounded-md transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/dashboard?sensorId=${sensor.id}#charts`);
                  }}
                >
                  View Details
                </button>

              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Layer controls */}
      <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-1.5">
        <button
          onClick={() => setShowMarkers(!showMarkers)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium shadow-md transition-all ${
            showMarkers ? 'bg-primary text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          Markers
        </button>
        <div className="mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {(['light', 'dark', 'satellite'] as const).map((style) => (
            <button
              key={style}
              onClick={() => setMapStyle(style)}
              className={`block w-full px-3 py-1.5 text-xs font-medium transition-colors ${
                mapStyle === style ? 'bg-primary/10 text-primary' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-16 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md px-3 py-2.5 rounded-lg shadow-md text-xs z-[1000]">
        <div className="font-medium mb-1.5 text-gray-700 dark:text-gray-200">AQI Legend</div>
        <div className="flex flex-col space-y-1">
          {[
            { label: 'Good', color: '#4ade80' },
            { label: 'Moderate', color: '#facc15' },
            { label: 'Unhealthy for Sensitive', color: '#f97316' },
            { label: 'Unhealthy', color: '#ef4444' },
            { label: 'Very Unhealthy', color: '#8b5cf6' },
            { label: 'Hazardous', color: '#7f1d1d' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-600 dark:text-gray-300">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AQMap;