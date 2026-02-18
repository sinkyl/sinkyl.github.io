export type PaletteColorKey = 'red' | 'green' | 'yellow' | 'blue' | 'purple' | 'cyan' | 'orange';

export interface Project {
  id: string;
  name: string;
  colorKey: PaletteColorKey;
  icon: string;
  shortDescription: string;
  description: string;
  slideCount: number;
}

export const projects: Project[] = [
  {
    id: 'xtranodly',
    name: 'xtranodly.ai',
    colorKey: 'blue',
    icon: '◈',
    shortDescription: 'Rust node graph framework',
    description: 'A Rust-native node graph framework — context nodes nest arbitrarily deep, open as floating panels or detached windows, and bridge nodes wire data across contexts without direct edges.',
    slideCount: 4,
  },
  {
    id: 'bazaar',
    name: 'Bazaar.Shop',
    colorKey: 'orange',
    icon: '◉',
    shortDescription: 'Region-based marketplace platform',
    description: 'A region-based marketplace platform where each region runs its own Identity, Marketplace, and Payment clusters — while stores deploy as independent microservice clusters.',
    slideCount: 4,
  },
  {
    id: 'spatium',
    name: 'Spatium.ai',
    colorKey: 'purple',
    icon: '◎',
    shortDescription: 'Spatial computing',
    description: 'What if computation wasn\'t about connections, but about resonance?',
    slideCount: 4,
  }
];

export const getProject = (id: string): Project | undefined =>
  projects.find(p => p.id === id);

export const getProjectColorKey = (id: string): PaletteColorKey =>
  getProject(id)?.colorKey || 'blue';

export const getProjectColorVar = (id: string): string =>
  `var(--color-${getProjectColorKey(id)})`;

// used in nav dropdown etc
export const projectColors = Object.fromEntries(
  projects.map(p => [p.id, { name: p.name, colorKey: p.colorKey }])
) as Record<string, { name: string; colorKey: PaletteColorKey }>;
