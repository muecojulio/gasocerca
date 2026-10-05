// Shared, framework-independent interaction rules. Distances are CSS pixels.
export const INTERACTIVE_SELECTOR = [
  "button", "a[href]", "input", "select", "textarea", "label", "summary",
  '[role="button"]', '[role="link"]', '[role="tab"]', '[role="combobox"]',
  '[role="switch"]', '[role="slider"]', '[role="checkbox"]', '[role="radio"]',
  '[role="spinbutton"]', '[role="listbox"]', '[role="option"]',
  '[contenteditable]:not([contenteditable="false"])',
  "[data-no-swipe]", ".leaflet-container", "#map",
].join(", ");

export const SECTION_SWIPE_EXCLUSIONS = `${INTERACTIVE_SELECTOR}, [data-horizontal-scroll], [data-swipe-actions]`;

export function normalizeSearch(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-MX")
    .replace(/\s+/g, " ")
    .trim();
}

export function filterOptions(options, query) {
  const normalized = normalizeSearch(query);
  return options.filter((option) => normalizeSearch(option.label).includes(normalized));
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function gestureAxis(dx, dy, slop = 10, ratio = 1.2) {
  const x = Math.abs(dx);
  const y = Math.abs(dy);
  if (Math.max(x, y) < slop) return null;
  if (x > y * ratio) return "horizontal";
  if (y > x * ratio) return "vertical";
  return null;
}

export function isHorizontalSwipe({ dx, dy, duration }) {
  if (gestureAxis(dx, dy) !== "horizontal") return false;
  const distance = Math.abs(dx);
  const velocity = distance / Math.max(duration, 1);
  return distance >= 48 || (distance >= 20 && velocity >= 0.45);
}

export function revealOffset(startOffset, dx, width) {
  return clamp(startOffset - dx, 0, width);
}

export function shouldRevealActions({ offset, dx, duration, width }) {
  const velocity = Math.abs(dx) / Math.max(duration, 1);
  if (Math.abs(dx) >= 18 && velocity >= 0.45) return dx < 0;
  return offset >= width * 0.42;
}

export function tabIndexForKey(key, current, count) {
  if (count < 1) return -1;
  switch (key) {
    case "ArrowRight": return (current + 1) % count;
    case "ArrowLeft": return (current - 1 + count) % count;
    case "Home": return 0;
    case "End": return count - 1;
    default: return -1;
  }
}

export function scrollEdges({ scrollLeft, scrollWidth, clientWidth }) {
  const max = Math.max(0, scrollWidth - clientWidth);
  return { before: scrollLeft > 2, after: max - scrollLeft > 2 };
}

export function centeredScrollLeft({ scrollLeft, itemLeft, viewportLeft, itemWidth, clientWidth, scrollWidth }) {
  return clamp(
    scrollLeft + itemLeft - viewportLeft - (clientWidth - itemWidth) / 2,
    0,
    Math.max(0, scrollWidth - clientWidth)
  );
}
