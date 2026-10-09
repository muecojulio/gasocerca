export const MEXICO_BOUNDS = Object.freeze({
  minLat: 14,
  maxLat: 33,
  minLng: -118.5,
  maxLng: -86,
});

export function isMexicoCoordinate(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= MEXICO_BOUNDS.minLat && lat <= MEXICO_BOUNDS.maxLat &&
    lng >= MEXICO_BOUNDS.minLng && lng <= MEXICO_BOUNDS.maxLng;
}
