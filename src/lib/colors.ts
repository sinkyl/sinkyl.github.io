import { COLORS } from './theme';

// Tech-specific colors (brand colors for technologies)
export const techColors: Record<string, string> = {
  'Rust': '#DEA584',
  'TypeScript': '#3178C6',
  'JavaScript': '#F7DF1E',
  'C#': '#68217A',
  'Python': '#3776AB',
  '.NET': '#512BD4',
  '.NET 9': '#512BD4',
  'Docker': '#2496ED',
  'gRPC': '#244C5A',
  'Tauri': '#FFC131',
  'C': '#A8B9CC',
  'Go': '#00ADD8',
  'React': '#61DAFB',
  'Node.js': '#339933',
  'Angular': '#DD0031',
  'Vue': '#4FC08D',
  'Svelte': '#FF3E00',
  'WASM': '#654FF0',
  'MongoDB': '#47A248',
  'Redis': '#DC382D',
  'PostgreSQL': '#4169E1',
  'MySQL': '#4479A1',
  'Kubernetes': '#326CE5',
  'AWS': '#FF9900',
  'Azure': '#0078D4',
  'GraphQL': '#E10098',
  'VHDL': '#8B5CF6',
  'SQL': '#F29111',
  'NoSQL': '#4DB33D',
};

export const getTechColor = (tech: string): string => techColors[tech] || COLORS.muted;
