import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { DayRead } from '../types';

// Color palette per day (dark theme friendly)
const DAY_COLORS = [
  '#3b82f6', // blue (Day 1)
  '#22c55e', // green (Day 2/3)
  '#f97316', // orange (Day 4)
  '#a855f7', // purple (Day 5+)
];

// Decode polyline — Google/OSRM format
function decodePolyline(encoded: string): [number, number][] {
  const result: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let resultLat = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      resultLat |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dLat = resultLat & 1 ? ~(resultLat >> 1) : (resultLat >> 1);
    lat += dLat;

    shift = 0;
    let resultLng = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      resultLng |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dLng = resultLng & 1 ? ~(resultLng >> 1) : (resultLng >> 1);
    lng += dLng;

    result.push([lng / 1e5, lat / 1e5]);
  }

  return result;
}

function getMarkerColor(type: string): string {
  switch (type) {
    case 'start': return '#22c55e';
    case 'end': return '#ef4444';
    case 'gas': return '#f59e0b';
    case 'meal': return '#ec4899';
    case 'overnight': return '#6366f1';
    default: return '#9ca3af';
  }
}

interface RideMapProps {
  days: DayRead[];
  activeDay: number | null;
  selectedStopId?: number | null;
  onMarkerClick: (stopId: number) => void;
}

export default function RideMap({ days, activeDay, selectedStopId, onMarkerClick }: RideMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || days.length === 0) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN || '';
    const allStops = days.flatMap(d => d.stops || []);
    if (allStops.length === 0) return;

    const lats = allStops.map(s => s.lat);
    const lngs = allStops.map(s => s.lng);
    const bounds: [number, number, number, number] = [
      Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats),
    ];

    if (!mapRef.current) {
      const m = new mapboxgl.Map({
        container: mapContainer.current,
        style: token ? 'mapbox://styles/mapbox/streets-v12' : undefined,
        center: [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2],
        zoom: Math.max(7, 10 - (days.length * 1.5)),
        attributionControl: false,
      });

      if (token) {
        m.addControl(new mapboxgl.AttributionControl({ compact: true }));
      }

      m.on('load', () => {
        m.fitBounds(bounds, { padding: 50, duration: 400 });
      });

      mapRef.current = m;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [days]);

  // Update layers when activeDay or days change — clean and redraw
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    // Wait for map to be ready, then render layers
    const map = m!;

    const onLoad = () => {
      updateLayers();
    };

    if (m.loaded()) {
      updateLayers();
    } else {
      m.on('load', onLoad);
    }

    function updateLayers() {
      // Remove old route and marker layers/sources
      const style = map.getStyle();
      if (style) {
        for (const layer of style.layers || []) {
          if (layer.id.startsWith('route-') || layer.id.startsWith('marker-circle-')) {
            map.removeLayer(layer.id);
          }
        }
        const sourceIds = style.sources;
        if (sourceIds) {
          for (const key of Object.keys(sourceIds)) {
            if (key.startsWith('route-') || key.startsWith('marker-')) {
              map.removeSource(key);
            }
          }
        }
      }

      const visibleDays = activeDay !== null ? days.filter(d => d.day_number === activeDay) : days;
      const allStops = visibleDays.flatMap(d => d.stops || []);

      if (allStops.length > 0) {
        const lats = allStops.map(s => s.lat);
        const lngs = allStops.map(s => s.lng);
        if (lats.length > 0) {
          const bounds: [number, number, number, number] = [
            Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats),
          ];
          map.fitBounds(bounds, { padding: 50, duration: 300 });
        }

        visibleDays.forEach((day) => {
          const color = DAY_COLORS[day.day_number % DAY_COLORS.length];

          (day.legs || []).forEach((leg) => {
            try {
              const coords = decodePolyline(leg.route_geometry);

              map.addSource(`route-${day.id}-${leg.order_in_day}`, {
                type: 'geojson',
                data: {
                  type: 'Feature' as const,
                  geometry: {
                    type: 'LineString' as const,
                    coordinates: coords,
                  },
                  properties: {},
                } as GeoJSON.Feature<GeoJSON.LineString>,
              });

              map.addLayer({
                id: `route-line-${day.id}-${leg.order_in_day}`,
                type: 'line',
                source: `route-${day.id}-${leg.order_in_day}`,
                paint: {
                  'line-color': color,
                  'line-width': 4,
                  'line-opacity': activeDay !== null && day.day_number === activeDay ? 1 : 0.3,
                },
              });

              const stop = (day.stops || []).find(s => s.id === leg.end_stop_id);
              if (stop && stop.lat !== 0 && stop.lng !== 0) {
                map.addSource(`marker-${stop.id}`, {
                  type: 'geojson',
                  data: {
                    type: 'Feature' as const,
                    geometry: {
                      type: 'Point' as const,
                      coordinates: [stop.lng, stop.lat],
                    },
                    properties: {},
                  } as GeoJSON.Feature<GeoJSON.Point>,
                });

                const markerColor = getMarkerColor(stop.stop_type);
                map.addLayer({
                  id: `marker-circle-${stop.id}`,
                  type: 'circle',
                  source: `marker-${stop.id}`,
                  paint: {
                    'circle-radius': 8,
                    'circle-color': markerColor,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                  },
                });

                const markerLayer = `marker-circle-${stop.id}`;
                map.on('click', markerLayer, () => {
                  onMarkerClick(stop!.id);
                });

                map.on('mouseenter', markerLayer, () => {
                  (map.getCanvas() as HTMLCanvasElement).style.cursor = 'pointer';
                });
                map.on('mouseleave', markerLayer, () => {
                  (map.getCanvas() as HTMLCanvasElement).style.cursor = '';
                });
              }

            } catch (err) {
              console.warn('Failed to decode polyline for leg', leg.id, err);
            }
          });
        });
      }
    } // end updateLayers

    return () => {
      map.off('load', onLoad);
    };
  }, [days, activeDay]);

  // Highlight selected stop marker and pan to it
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !selectedStopId) return;

    const markerCircle = `marker-circle-${selectedStopId}`;
    if (m.getLayer(markerCircle)) {
      m.setPaintProperty(markerCircle, 'circle-radius', 12);
      m.setPaintProperty(markerCircle, 'circle-color', '#ef4444');

      // Pan map to selected stop
      const source = m.getSource(`marker-${selectedStopId}`);
      if (source) {
        const data = (source as any).data;
        if (data?.geometry?.coordinates) {
          const [lng, lat] = data.geometry.coordinates;
          m.flyTo({ center: [lng, lat], zoom: Math.max(m.getZoom(), 12), duration: 500 });
        }
      }
    }

  }, [selectedStopId]);

  return <div ref={mapContainer} className="w-full h-[60vh] min-h-[250px] bg-gray-100 dark:bg-gray-800" />;
}
