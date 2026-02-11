import { useJsApiLoader } from '@react-google-maps/api';

const libraries: ('places')[] = ['places'];

export function useGoogleMaps() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
    language: 'fa',
  });

  return { isLoaded, loadError };
}
