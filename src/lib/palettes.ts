export interface Palette {
  id: string;
  name: string;
  colors: {
    dark: PaletteColors;
    light: PaletteColors;
  };
}

export interface PaletteColors {
  accent: string;
  accentHover: string;
  accentMuted: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  purple: string;
  cyan: string;
  orange: string;
}

export const palettes: Palette[] = [
  {
    id: 'onedark',
    name: 'One Dark',
    colors: {
      dark: {
        accent: '#61afef',
        accentHover: '#8ac5f0',
        accentMuted: '#4d8fcc',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#e5c07b',
        blue: '#61afef',
        purple: '#c678dd',
        cyan: '#56b6c2',
        orange: '#d19a66',
      },
      light: {
        accent: '#0969da',
        accentHover: '#0550ae',
        accentMuted: '#218bff',
        red: '#cf222e',
        green: '#1a7f37',
        yellow: '#9a6700',
        blue: '#0969da',
        purple: '#8250df',
        cyan: '#0891b2',
        orange: '#bc4c00',
      },
    },
  },
  {
    id: 'circuit',
    name: 'Circuit',
    colors: {
      dark: {
        // PCB board: green substrate, copper traces, gold contacts
        accent: '#50b868',
        accentHover: '#68c878',
        accentMuted: '#409850',
        red: '#d87860',      // Warning LED
        green: '#50b868',    // PCB green
        yellow: '#d4a840',   // Gold contacts
        blue: '#5898b0',     // Cool solder
        purple: '#9878a8',   // Component purple
        cyan: '#58a898',     // Oxidized copper
        orange: '#c88850',   // Copper trace
      },
      light: {
        accent: '#308848',
        accentHover: '#206830',
        accentMuted: '#40a058',
        red: '#b85040',
        green: '#308848',
        yellow: '#a07818',
        blue: '#386880',
        purple: '#685080',
        cyan: '#388070',
        orange: '#986830',
      },
    },
  },
  {
    id: 'lahmacun',
    name: 'Lahmacun',
    colors: {
      dark: {
        // Warm spice market - toned down, earthy
        accent: '#c86830',
        accentHover: '#d87840',
        accentMuted: '#a85820',
        red: '#b84028',      // Paprika
        green: '#788850',    // Olive
        yellow: '#b89038',   // Turmeric
        blue: '#a07058',     // Clay
        purple: '#6a3727',   // Wine/sumac
        cyan: '#988860',     // Sesame
        orange: '#c87038',   // Spice
      },
      light: {
        accent: '#a04818',
        accentHover: '#883810',
        accentMuted: '#b85820',
        red: '#901808',
        green: '#485820',
        yellow: '#886010',
        blue: '#704828',
        purple: '#803038',
        cyan: '#686030',
        orange: '#a05018',
      },
    },
  },
  {
    id: 'sushi',
    name: 'Sushi',
    colors: {
      dark: {
        // Actual sushi: nori, rice, salmon, wasabi, ocean
        accent: '#48a890',
        accentHover: '#58b8a0',
        accentMuted: '#389078',
        red: '#e88898',      // Salmon pink
        green: '#2a5848',    // Nori seaweed (dark)
        yellow: '#c8c0a8',   // Rice/ginger cream
        blue: '#4890a8',     // Ocean
        purple: '#d898a8',   // Tuna pink
        cyan: '#48a890',     // Sea green (accent)
        orange: '#78c858',   // Wasabi green (not orange!)
      },
      light: {
        accent: '#287868',
        accentHover: '#186050',
        accentMuted: '#389078',
        red: '#c86070',
        green: '#183828',
        yellow: '#989078',
        blue: '#286878',
        purple: '#a86878',
        cyan: '#287868',
        orange: '#488828',
      },
    },
  },
];

export function getPalette(id: string): Palette | undefined {
  return palettes.find(p => p.id === id);
}

export function getPaletteIds(): string[] {
  return palettes.map(p => p.id);
}

export function getPalettePreviewColor(id: string): string {
  const palette = getPalette(id);
  return palette?.colors.dark.accent ?? '#61afef';
}
