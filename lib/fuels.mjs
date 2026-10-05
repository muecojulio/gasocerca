export const FUELS = Object.freeze([
  Object.freeze({ id: "regular", label: "Magna" }),
  Object.freeze({ id: "premium", label: "Premium" }),
]);

export const DEFAULT_FUEL = FUELS[0].id;
export const INVALID_FUEL_MESSAGE = "Combustible no válido. Elige gasolina Magna o premium.";

const FUEL_IDS = new Set(FUELS.map(({ id }) => id));

export function isFuelType(value) {
  return FUEL_IDS.has(value);
}

// An omitted value defaults to Magna; explicit unsupported types are rejected.
export function parseFuelType(value) {
  if (value == null) return DEFAULT_FUEL;
  return isFuelType(value) ? value : null;
}
