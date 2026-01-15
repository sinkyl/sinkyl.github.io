export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
  shortDescription: string;
  description: string;
  extendedDescription?: string;
}

export const projects: Project[] = [
  {
    id: 'xtranodly',
    name: 'xtranodly.ai',
    color: '#61afef',
    icon: '◈',
    shortDescription: 'Visual programming & AI workflows',
    description: 'A visual node-based graph system for building AI workflows, data pipelines, and complex automation. Drag, connect, and orchestrate — code optional.',
    extendedDescription: `The platform features an intuitive canvas where nodes represent discrete operations — from data ingestion and transformation to model inference and output routing. Each node exposes configurable parameters through a clean interface, allowing fine-grained control without diving into code.

Under the hood, the execution engine handles parallelization, error recovery, and resource management automatically. Workflows can be versioned, exported, and shared across teams. Integration with popular ML frameworks, databases, and cloud services comes built-in through our extensible connector system.`
  },
  {
    id: 'bazaar',
    name: 'Bazaar.Shop',
    color: '#d19a66',
    icon: '◉',
    shortDescription: 'Marketplace platform',
    description: 'A multi-tenant marketplace platform with PCI-DSS compliant payments, SSO authentication, and a microservices architecture designed for scale.',
    extendedDescription: `The architecture separates concerns across dedicated services: catalog management, order processing, inventory sync, and payment orchestration each run independently with event-driven communication.

Sellers onboard through a streamlined verification flow with KYC/AML compliance checks. The storefront SDK enables white-label deployments with customizable themes, while the admin dashboard provides real-time analytics on GMV, conversion funnels, and seller performance metrics.`
  },
  {
    id: 'spatium',
    name: 'Spatium.ai',
    color: '#c678dd',
    icon: '◎',
    shortDescription: 'Spatial computing',
    description: 'Spatial computing platform for immersive 3D experiences, AR/VR applications, and next-generation human-computer interaction.',
    extendedDescription: `Built on a custom rendering engine optimized for mixed reality, Spatium handles spatial anchoring, occlusion mapping, and hand tracking with sub-millisecond latency. The scene graph supports collaborative editing where multiple users can manipulate shared 3D spaces in real-time.

Developers access these capabilities through a declarative API that abstracts device-specific quirks across Meta Quest, Apple Vision Pro, and HoloLens. Asset pipelines support glTF, USD, and proprietary formats with automatic LOD generation and texture compression.`
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
