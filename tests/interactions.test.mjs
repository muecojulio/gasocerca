import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  centeredScrollLeft, clamp, filterOptions, gestureAxis, INTERACTIVE_SELECTOR,
  isHorizontalSwipe, normalizeSearch, revealOffset, scrollEdges,
  SECTION_SWIPE_EXCLUSIONS, shouldRevealActions, tabIndexForKey,
} from "../lib/interactions.mjs";

describe("Búsqueda en español", () => {
  it("ignora mayúsculas, diacríticos y espacio adicional", () => {
    assert.equal(normalizeSearch("  MÉRIDA   Yucatán "), "merida yucatan");
    assert.equal(normalizeSearch("México"), normalizeSearch("MEXICO"));
    assert.equal(normalizeSearch("Diésel"), "diesel");
    assert.equal(normalizeSearch(null), "");
  });
  it("filtra opciones locales sin perder sus etiquetas", () => {
    const options = [{ label: "Mérida, Yucatán" }, { label: "México" }, { label: "Monterrey" }];
    assert.deepEqual(filterOptions(options, "MERIDA"), [options[0]]);
    assert.deepEqual(filterOptions(options, "mexico"), [options[1]]);
    assert.deepEqual(filterOptions(options, ""), options);
    assert.deepEqual(filterOptions(options, "sin coincidencias"), []);
  });
});

describe("Bloqueo de eje y swipe de secciones", () => {
  it("no captura pequeños movimientos ni diagonales ambiguas", () => {
    assert.equal(gestureAxis(5, 1), null);
    assert.equal(gestureAxis(30, 30), null);
    assert.equal(gestureAxis(36, 30), null); // la relación debe superar 1.2
  });
  it("distingue el scroll vertical y ambos sentidos horizontales", () => {
    assert.equal(gestureAxis(15, 40), "vertical");
    assert.equal(gestureAxis(-45, 20), "horizontal");
    assert.equal(gestureAxis(45, -20), "horizontal");
  });
  it("requiere distancia o velocidad suficientes", () => {
    assert.equal(isHorizontalSwipe({ dx: 49, dy: 10, duration: 700 }), true);
    assert.equal(isHorizontalSwipe({ dx: -22, dy: 3, duration: 40 }), true);
    assert.equal(isHorizontalSwipe({ dx: 22, dy: 3, duration: 300 }), false);
    assert.equal(isHorizontalSwipe({ dx: 8, dy: 0, duration: 1 }), false);
    assert.equal(isHorizontalSwipe({ dx: 60, dy: 70, duration: 20 }), false);
    assert.equal(isHorizontalSwipe({ dx: 60, dy: 60, duration: 20 }), false);
  });
  it("excluye controles, mapas y carriles anidados", () => {
    for (const selector of ["button", "a[href]", "input", "select", "textarea", '[role="tab"]', '[role="combobox"]', "[data-no-swipe]", ".leaflet-container"]) {
      assert.ok(INTERACTIVE_SELECTOR.includes(selector), selector);
    }
    assert.ok(SECTION_SWIPE_EXCLUSIONS.includes("[data-horizontal-scroll]"));
    assert.ok(SECTION_SWIPE_EXCLUSIONS.includes("[data-swipe-actions]"));
  });
});

describe("Acciones contextuales", () => {
  it("limita el desplazamiento al ancho real del panel", () => {
    assert.equal(revealOffset(0, -500, 144), 144);
    assert.equal(revealOffset(144, 500, 144), 0);
    assert.equal(revealOffset(0, -60, 144), 60);
    assert.equal(revealOffset(144, 60, 144), 84);
  });
  it("abre o cierra según el umbral, sin rebote", () => {
    assert.equal(shouldRevealActions({ offset: 70, dx: -70, duration: 500, width: 144 }), true);
    assert.equal(shouldRevealActions({ offset: 35, dx: -35, duration: 500, width: 144 }), false);
    assert.equal(shouldRevealActions({ offset: 40, dx: 104, duration: 700, width: 144 }), false);
  });
  it("admite un gesto rápido pero no pequeños roces", () => {
    assert.equal(shouldRevealActions({ offset: 24, dx: -24, duration: 40, width: 144 }), true);
    assert.equal(shouldRevealActions({ offset: 120, dx: 24, duration: 40, width: 144 }), false);
    assert.equal(shouldRevealActions({ offset: 5, dx: -5, duration: 1, width: 144 }), false);
  });
  it("nunca produce offsets fuera de los límites", () => {
    for (let dx = -1000; dx <= 1000; dx += 7) {
      for (const start of [0, 72, 144]) {
        const offset = revealOffset(start, dx, 144);
        assert.ok(offset >= 0 && offset <= 144);
      }
    }
  });
});

describe("Teclado de pestañas", () => {
  it("flechas recorren y envuelven el conjunto", () => {
    assert.equal(tabIndexForKey("ArrowRight", 0, 5), 1);
    assert.equal(tabIndexForKey("ArrowRight", 4, 5), 0);
    assert.equal(tabIndexForKey("ArrowLeft", 0, 5), 4);
  });
  it("Inicio y Fin llegan a sus extremos", () => {
    assert.equal(tabIndexForKey("Home", 3, 5), 0);
    assert.equal(tabIndexForKey("End", 0, 5), 4);
  });
  it("no secuestra Tab, Enter ni otras teclas", () => {
    assert.equal(tabIndexForKey("Tab", 2, 5), -1);
    assert.equal(tabIndexForKey("Enter", 2, 5), -1);
    assert.equal(tabIndexForKey("ArrowRight", 0, 0), -1);
  });
});

describe("Carriles nativos", () => {
  it("solo muestra indicadores cuando hay contenido fuera de vista", () => {
    assert.deepEqual(scrollEdges({ scrollLeft: 0, scrollWidth: 300, clientWidth: 300 }), { before: false, after: false });
    assert.deepEqual(scrollEdges({ scrollLeft: 0, scrollWidth: 600, clientWidth: 300 }), { before: false, after: true });
    assert.deepEqual(scrollEdges({ scrollLeft: 150, scrollWidth: 600, clientWidth: 300 }), { before: true, after: true });
    assert.deepEqual(scrollEdges({ scrollLeft: 300, scrollWidth: 600, clientWidth: 300 }), { before: true, after: false });
    assert.deepEqual(scrollEdges({ scrollLeft: 299, scrollWidth: 600, clientWidth: 300 }), { before: true, after: false });
  });
  it("centra la selección sin rebasar el scroll disponible", () => {
    const base = { scrollLeft: 0, itemLeft: 200, viewportLeft: 10, itemWidth: 50, clientWidth: 300, scrollWidth: 600 };
    assert.equal(centeredScrollLeft(base), 65);
    assert.equal(centeredScrollLeft({ ...base, itemLeft: 10 }), 0);
    assert.equal(centeredScrollLeft({ ...base, itemLeft: 900 }), 300);
    assert.equal(centeredScrollLeft({ ...base, scrollWidth: 300 }), 0);
  });
  it("limita índices de sección a los extremos", () => {
    assert.equal(clamp(-1, 0, 4), 0);
    assert.equal(clamp(5, 0, 4), 4);
  });
});
