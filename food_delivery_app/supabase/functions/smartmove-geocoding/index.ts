import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MAPBOX_TOKEN = Deno.env.get('MAPBOX_ACCESS_TOKEN') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface GeocodingRequest {
  action: 'forward' | 'reverse' | 'autocomplete';
  query: string;
  lat?: number;
  lng?: number;
  limit?: number;
  language?: string;
}

interface GeocodingFeature {
  id: string;
  place_name: string;
  center: [number, number];
  address?: string;
  context?: Record<string, string>;
  placeType: string;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: GeocodingRequest = await req.json();
    const { action, query, lat, lng, limit = 5, language = 'en' } = body;

    if (!MAPBOX_TOKEN) {
      return new Response(JSON.stringify({ error: 'Mapbox token not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let features: GeocodingFeature[] = [];

    switch (action) {
      case 'forward':
        features = await forwardGeocode(query, limit, language);
        break;
      case 'reverse':
        if (lat === undefined || lng === undefined) {
          return new Response(JSON.stringify({ error: 'lat and lng required for reverse geocode' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        features = await reverseGeocode(lat, lng, language);
        break;
      case 'autocomplete':
        features = await autocomplete(query, limit, language, lat, lng);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action. Use forward, reverse, or autocomplete' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ features }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function forwardGeocode(query: string, limit: number, language: string): Promise<GeocodingFeature[]> {
  const url = new URL('https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(query) + '.json');
  url.searchParams.set('access_token', MAPBOX_TOKEN);
  url.searchParams.set('limit', limit.toString());
  url.searchParams.set('language', language);
  url.searchParams.set('country', 'TZ');

  const response = await fetch(url.toString());
  const data = await response.json();

  return (data.features || []).map((f: any) => ({
    id: f.id,
    place_name: f.place_name,
    center: f.center,
    address: f.properties?.address,
    context: parseContext(f.context || []),
    placeType: f.place_type?.[0] || 'unknown',
  }));
}

async function reverseGeocode(lat: number, lng: number, language: string): Promise<GeocodingFeature[]> {
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`);
  url.searchParams.set('access_token', MAPBOX_TOKEN);
  url.searchParams.set('limit', '1');
  url.searchParams.set('language', language);

  const response = await fetch(url.toString());
  const data = await response.json();

  return (data.features || []).map((f: any) => ({
    id: f.id,
    place_name: f.place_name,
    center: f.center,
    address: f.properties?.address,
    context: parseContext(f.context || []),
    placeType: f.place_type?.[0] || 'unknown',
  }));
}

async function autocomplete(query: string, limit: number, language: string, lat?: number, lng?: number): Promise<GeocodingFeature[]> {
  const url = new URL('https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(query) + '.json');
  url.searchParams.set('access_token', MAPBOX_TOKEN);
  url.searchParams.set('limit', limit.toString());
  url.searchParams.set('language', language);
  url.searchParams.set('country', 'TZ');
  url.searchParams.set('types', 'address,place,locality,neighborhood,poi');
  url.searchParams.set('autocomplete', 'true');

  if (lat !== undefined && lng !== undefined) {
    url.searchParams.set('proximity', `${lng},${lat}`);
  }

  const response = await fetch(url.toString());
  const data = await response.json();

  return (data.features || []).map((f: any) => ({
    id: f.id,
    place_name: f.place_name,
    center: f.center,
    address: f.properties?.address,
    context: parseContext(f.context || []),
    placeType: f.place_type?.[0] || 'unknown',
  }));
}

function parseContext(context: any[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of context) {
    const type = item.id?.split('.').shift();
    if (type && item.text) {
      result[type] = item.text;
    }
  }
  return result;
}
