// Location icons — minimalist SVG shapes for venue locations

const LOCATION_ICONS = {
  japan: {
    viewBox: '0 0 24 30',
    // Real outlines: Shikoku, Honshu, Hokkaido (from GeoJSON)
    path: 'M8 21L8 21.5L7.5 22.5L7 22L6 22L5.5 23L4.5 22.5L4.5 22L5.5 21L6.5 21L7 20.5L8 21Z' +
      'M17 16.5L16.5 18L16.5 18.5L16 19.5L14 20L11.5 20.5L9.5 22L8.5 21.5L8.5 20.5' +
      'L2.5 21.5L4 22.5L3 25L2.5 25.5L1.5 25L2 23.5L1 23L0.5 22L2 21.5L5 19L8 18.5' +
      'L9.5 19L11 16.5L12 17L14 15.5L15.5 13.5L15.5 12L16 11L17.5 10.5L18.5 12.5' +
      'L18.5 13.5L17 15L17 16.5Z' +
      'M21 6.5L22 7L23 6.5L23.5 8L21.5 8.5L20 9.5L18 8.5L17 10.5L15.5 10.5L15.5 9' +
      'L16 8L17.5 7.5L18.5 4.5L21 6.5Z',
    // Tokyo: east coast of Honshu
    dot: { cx: 15.2, cy: 18.7 },
  },
  puertoRico: {
    viewBox: '0 -8 28 30',
    // Real outline from GeoJSON — 82-point coastline
    path: 'M15.52,2.95L16.14,3.02L16.89,3.08L17.85,3.21L18.75,3.32L20.17,3.59' +
      'L20.95,4.11L21.59,3.92L23.44,4.44L24.42,4.41L25.36,4.38L26.16,4.61' +
      'L27.17,4.77L27.46,5.82L26.76,6.55L25.77,6.62L24.87,6.15L23.88,5.95' +
      'L23.35,6.69L23.04,6.89L24.51,6.86L25.81,7.01L26.7,7.36L26.74,8.27' +
      'L25.8,8.62L24.77,8.81L23.82,9.04L23.04,9.13L21.96,8.78L21.74,7.82' +
      'L20.97,7.92L20.54,8.44L20.23,8.99L19.81,9.47L18.71,10.28L17.42,10.46' +
      'L16.38,10.75L15.22,11.03L13.86,11.19L13.19,11.01L12.54,11.08L11.93,11.08' +
      'L11.25,11.21L10.53,11.6L9.75,11.15L9.74,10.64L9.04,10.61L8.15,10.61' +
      'L7.47,10.56L6.79,10.73L5.95,10.85L5.42,11.05L4.59,10.96L4.0,10.92' +
      'L3.28,10.82L2.6,10.88L1.68,10.81L1.22,10.2L1.26,9.43L1.38,8.19' +
      'L1.57,7.81L1.67,7.12L1.73,6.64L1.09,6.15L0.54,5.2L1.04,4.34' +
      'L1.78,3.54L2.11,2.89L3.09,2.43L4.8,2.64L5.78,2.8L6.88,2.69' +
      'L7.88,2.91L8.7,2.75L9.6,2.7L10.31,2.77L11.34,2.77L12.34,2.73' +
      'L13.16,2.85L14.05,2.91L14.95,2.92L15.52,2.95Z',
    // San Juan: north-east coast
    dot: { cx: 21.5, cy: 4.2 },
  },
  texas: {
    viewBox: '0 0 24 26',
    // Real outline from GeoJSON — panhandle, Gulf coast, Rio Grande
    path: 'M9 3.5L12 3.5L12 7L12.5 7.5L17 8.5L20.5 8L22.5 9L22.5 11.5L23.5 13' +
      'L23 15.5L21 15.5L21 16.5L20 17L18 17.5L18.5 18L18 18L16.5 19.5L17 22' +
      'L14 21.5L13 19.5L9.5 15.5L8 15.5L6.5 17L4 15.5L3.5 14L0.5 12L7 11.5' +
      'L7 3.5L9 3.5Z',
    // Houston: southeast area
    dot: { cx: 20.3, cy: 15.5 },
  },
  florida: {
    viewBox: '0 0 22 28',
    // Real outline from GeoJSON — panhandle, peninsula, Keys
    path: 'M6.5 6L8 6L8 6.5L15.5 7L15.5 7.5L16 6.5L17.5 6.5L18 9L20 13L20 14' +
      'L21.5 17.5L21 20.5L20 22L18.5 22L18 20L17 20L16 18.5L16 17.5L15.5 17.5' +
      'L14 15.5L15 14.5L14 15L13.5 14.5L14.5 11.5L11.5 9L10.5 8.5L9.5 8.5' +
      'L9.5 9L7 9.5L6.5 9L4 7.5L1 8L1 7.5L0.5 6L6.5 6Z',
    // Miami: southern tip, east side
    dot: { cx: 21.1, cy: 20.4 },
  },
};

// Map venue strings to location keys
function getLocationKey(venue) {
  if (!venue) return null;
  const v = venue.toLowerCase();
  if (v.includes('tokyo')) return 'japan';
  if (v.includes('san juan') || v.includes('bithorn') || v.includes('puerto')) return 'puertoRico';
  if (v.includes('houston') || v.includes('daikin')) return 'texas';
  if (v.includes('miami') || v.includes('loandepot')) return 'florida';
  return null;
}

// Returns an inline SVG string for the location icon
function locationIconSVG(venue) {
  const key = getLocationKey(venue);
  if (!key) return '';
  const loc = LOCATION_ICONS[key];
  return `<svg class="location-icon" viewBox="${loc.viewBox}" aria-hidden="true">` +
    `<path d="${loc.path}" fill="var(--location-fill)" stroke="var(--location-stroke)" stroke-width="1" stroke-linejoin="round" fill-rule="evenodd"/>` +
    `<circle cx="${loc.dot.cx}" cy="${loc.dot.cy}" r="1.8" fill="var(--location-dot)"/>` +
    `</svg>`;
}
