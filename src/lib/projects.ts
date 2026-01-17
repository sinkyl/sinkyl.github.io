export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
  shortDescription: string;
  description: string;
}

export const projects: Project[] = [
  {
    id: 'xtranodly',
    name: 'xtranodly.ai',
    color: '#61afef',
    icon: '◈',
    shortDescription: 'Visual programming & AI workflows',
    description: 'A visual node-based graph system for building AI workflows, data pipelines, and complex automation. Drag, connect, and orchestrate — code optional.'
  },
  {
    id: 'bazaar',
    name: 'Bazaar.Shop',
    color: '#d19a66',
    icon: '◉',
    shortDescription: 'Marketplace platform',
    description: 'A multi-tenant marketplace platform with PCI-DSS compliant payments, SSO authentication, and a microservices architecture designed for scale.'
  },
  {
    id: 'spatium',
    name: 'Spatium.ai',
    color: '#c678dd',
    icon: '◎',
    shortDescription: 'Spatial computing',
    description: 'Spatial computing platform for immersive 3D experiences, AR/VR applications, and next-generation human-computer interaction.'
  }
];

export const getProject = (id: string): Project | undefined =>
  projects.find(p => p.id === id);

export const getProjectColor = (id: string): string =>
  getProject(id)?.color || '#8b949e';

// For nav dropdown and other places that need just id/name/color
export const projectColors = Object.fromEntries(
  projects.map(p => [p.id, { name: p.name, color: p.color }])
) as Record<string, { name: string; color: string }>;
