import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isMexicoCoordinate, MEXICO_BOUNDS } from "../lib/geo.mjs";

describe("Validación geográfica de México", () => {
  it("acepta el interior y los límites del área cubierta", () => {
    assert.equal(isMexicoCoordinate(19.4326, -99.1332), true);
    assert.equal(isMexicoCoordinate(MEXICO_BOUNDS.minLat, MEXICO_BOUNDS.minLng), true);
    assert.equal(isMexicoCoordinate(MEXICO_BOUNDS.maxLat, MEXICO_BOUNDS.maxLng), true);
  });

  it("rechaza coordenadas no finitas o fuera del área cubierta", () => {
    assert.equal(isMexicoCoordinate(Number.NaN, -99), false);
    assert.equal(isMexicoCoordinate(19, Number.POSITIVE_INFINITY), false);
    assert.equal(isMexicoCoordinate(13.99, -99), false);
    assert.equal(isMexicoCoordinate(19, -118.51), false);
    assert.equal(isMexicoCoordinate(19, -85.99), false);
  });

  it("requiere números ya analizados, no cadenas", () => {
    assert.equal(isMexicoCoordinate("19.4326", "-99.1332"), false);
  });
});
