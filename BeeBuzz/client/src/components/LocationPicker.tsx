import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LocationPicker.css';

const defaultMarker = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

interface LocationPickerProps {
  label: string;
  defaultLat?: number;
  defaultLng?: number;
  onLocationSelect: (address: string, lat: number, lng: number) => void;
}

// Custom hook to handle map clicks
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Custom hook to automatically re-center map when coordinates change externally
function MapCenterer({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ label, defaultLat = 20.5937, defaultLng = 78.9629, onLocationSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [lat, setLat] = useState(defaultLat);
  const [lng, setLng] = useState(defaultLng);
  // Debouncing timeout
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await resp.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch(err) {
      console.error("Geocoding API fetch failed", err);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(e.target.value);
    }, 600); // 600ms debounce
  };

  const selectSuggestion = (suggestion: any) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    const address = suggestion.display_name;
    
    setLat(lat);
    setLng(lng);
    setSearchQuery(address);
    setShowSuggestions(false);
    onLocationSelect(address, lat, lng);
  };

  const handleMapClick = async (clickedLat: number, clickedLng: number) => {
    setLat(clickedLat);
    setLng(clickedLng);
    setSearchQuery('Fetching address...');
    
    try {
      // Reverse Geocoding
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${clickedLat}&lon=${clickedLng}`);
      const data = await resp.json();
      const address = data.display_name || 'Unknown Location';
      
      setSearchQuery(address);
      onLocationSelect(address, clickedLat, clickedLng);
    } catch(err) {
      console.error("Reverse geocoding failed", err);
      // Fallback
      const fallbackStr = `Coordinates: ${clickedLat.toFixed(4)}, ${clickedLng.toFixed(4)}`;
      setSearchQuery(fallbackStr);
      onLocationSelect(fallbackStr, clickedLat, clickedLng);
    }
  };

  return (
    <div className="location-picker form-group">
      <label className="form-label" style={{ fontWeight: 'bold' }}>{label}</label>
      
      <div className="search-container">
        <input 
          type="text" 
          className="input search-input" 
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
          placeholder="Type an address to search..."
          required
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="suggestions-list">
            {suggestions.map((s, idx) => (
              <li key={idx} onClick={() => selectSuggestion(s)}>
                {s.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="picker-map-wrapper">
        <div className="picker-map-hint">📌 Click on map to place pin</div>
        <MapContainer center={[lat, lng]} zoom={5} className="picker-map">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[lat, lng]} icon={defaultMarker} />
          <MapClickHandler onMapClick={handleMapClick} />
          <MapCenterer lat={lat} lng={lng} />
        </MapContainer>
      </div>
    </div>
  );
};

export default LocationPicker;
