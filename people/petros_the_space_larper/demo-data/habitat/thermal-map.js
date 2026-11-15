export const temperatureScale = [
  [16, '#7a92ff'],
  [19, '#58c8ff'],
  [21, '#62ddb6'],
  [22, '#f4e27d'],
  [24, '#ffad63'],
  [27, '#ff8665'],
  [30, '#ff6d8b'],
];

// Positions are normalized to the Falcon drawing. Offsets are illustrative zone values.
const zones = [
  { name: 'Forward storage', x: .423, y: .158, offset: -7.0 },
  { name: 'Forward equipment', x: .575, y: .174, offset: -4.1 },
  { name: 'Crew cockpit', x: .731, y: .348, offset: -2.1 },
  { name: 'Water recycler', x: .345, y: .565, offset: -3.5 },
  { name: 'Main lounge', x: .500, y: .569, offset: 0 },
  { name: 'Starboard systems', x: .619, y: .619, offset: 1.6 },
  { name: 'Aft engineering', x: .495, y: .863, offset: 6.2 },
];

const colorStops = temperatureScale.map(([degrees, hex]) => ({
  degrees,
  rgb: [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16)),
}));

function temperatureRgb(value) {
  if (value <= colorStops[0].degrees) return colorStops[0].rgb;
  if (value >= colorStops.at(-1).degrees) return colorStops.at(-1).rgb;
  const upper = colorStops.findIndex(stop => value <= stop.degrees);
  const low = colorStops[upper - 1];
  const high = colorStops[upper];
  const fraction = (value - low.degrees) / (high.degrees - low.degrees);
  return low.rgb.map((channel, i) => Math.round(channel + (high.rgb[i] - channel) * fraction));
}

export const temperatureColor = value => `rgb(${temperatureRgb(value).join(' ')})`;

export function simulatedZones(reference) {
  return zones.map(zone => ({ ...zone, temperature: Number.isFinite(reference) ? reference + zone.offset : null }));
}

export function temperatureAt(samples, x, y) {
  let weighted = 0;
  let total = 0;
  for (const zone of samples) {
    // Match the body preview's inverse-distance weighting in the drawing's 3:2 aspect ratio.
    const distanceSquared = ((x - zone.x) * 1.5) ** 2 + (y - zone.y) ** 2;
    const weight = 1 / (distanceSquared ** 2 + .00002);
    weighted += zone.temperature * weight;
    total += weight;
  }
  return weighted / total;
}

export function createFalconHeatmap(image) {
  const canvas = document.createElement('canvas');
  canvas.width = 216;
  canvas.height = 144;
  const context = canvas.getContext('2d');
  let lastReference;

  return reference => {
    if (!context || reference === lastReference) return;
    lastReference = reference;
    if (!Number.isFinite(reference)) {
      image.removeAttribute('href');
      return;
    }

    const samples = simulatedZones(reference);
    const { width, height } = canvas;
    const pixels = context.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const value = temperatureAt(samples, (x + .5) / width, (y + .5) / height);
        const [red, green, blue] = temperatureRgb(value);
        const offset = (y * width + x) * 4;
        pixels.data.set([red, green, blue, 255], offset);
      }
    }
    context.putImageData(pixels, 0, 0);
    image.setAttribute('href', canvas.toDataURL());
  };
}
