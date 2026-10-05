import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_FUEL,
  FUELS,
  INVALID_FUEL_MESSAGE,
  isFuelType,
  parseFuelType,
} from "../lib/fuels.mjs";

describe("Combustibles permitidos", () => {
  it("ofrece únicamente gasolina Magna y Premium", () => {
    assert.deepEqual(FUELS, [
      { id: "regular", label: "Magna" },
      { id: "premium", label: "Premium" },
    ]);
    assert.deepEqual(FUELS.map(({ id }) => id), ["regular", "premium"]);
  });

  it("usa Magna por defecto y rechaza explícitamente cualquier otro tipo", () => {
    assert.equal(DEFAULT_FUEL, "regular");
    assert.equal(parseFuelType(null), "regular");
    assert.equal(parseFuelType("regular"), "regular");
    assert.equal(parseFuelType("premium"), "premium");
    assert.equal(parseFuelType("diesel"), null);
    assert.equal(parseFuelType(""), null);
    assert.equal(isFuelType("diesel"), false);
    assert.equal(INVALID_FUEL_MESSAGE, "Combustible no válido. Elige gasolina Magna o premium.");
  });
});
