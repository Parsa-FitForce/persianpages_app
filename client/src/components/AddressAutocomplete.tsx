import { useRef, useCallback } from 'react';
import { Autocomplete } from '@react-google-maps/api';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (address: string, lat: number, lng: number, placeId: string) => void;
  countryCode?: string;
  isLoaded: boolean;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  countryCode,
  isLoaded,
}: AddressAutocompleteProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onLoad = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;

    const address = place.formatted_address || value;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const id = place.place_id || '';

    onPlaceSelect(address, lat, lng, id);
  }, [value, onPlaceSelect]);

  if (!isLoaded) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
        placeholder="خیابان، پلاک، واحد"
        required
      />
    );
  }

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{
        types: ['address'],
        fields: ['formatted_address', 'geometry', 'place_id'],
        ...(countryCode ? { componentRestrictions: { country: countryCode.toLowerCase() } } : {}),
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
        placeholder="خیابان، پلاک، واحد"
        required
      />
    </Autocomplete>
  );
}
