import type { CategoryResult, FileContent, TreeEntry, Signal, TechStackItem } from '../../types';

const MANIFEST_FILES = [
  'package.json', 'Cargo.toml', 'go.mod', 'requirements.txt',
  'Pipfile', 'pyproject.toml', 'setup.py', 'setup.cfg',
  'Gemfile', 'composer.json', 'pom.xml', 'build.gradle', 'build.gradle.kts',
];

const LOCKFILES = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'Cargo.lock', 'go.sum', 'Gemfile.lock',
];

export function analyzeDependencies(
  files: FileContent[],
  tree: TreeEntry[]
): { result: CategoryResult; techStack: TechStackItem[] } {
  const signals: Signal[] = [];
  const fileMap = new Map(files.map((f) => [f.path, f]));
  const treePaths = new Set(tree.map((e) => e.path));
  const techStack: TechStackItem[] = [];

  // Has manifest file
  const manifests = MANIFEST_FILES.filter((m) => fileMap.has(m) || treePaths.has(m));
  signals.push({
    name: 'Dependency manifest',
    found: manifests.length > 0,
    details: manifests.join(', '),
  });

  // Has lockfile
  const lockfiles = LOCKFILES.filter((l) => treePaths.has(l));
  signals.push({
    name: 'Lockfile present',
    found: lockfiles.length > 0,
    details: lockfiles.join(', '),
  });

  // Detect tech stack from package.json
  const pkg = fileMap.get('package.json');
  let depCount = 0;
  if (pkg) {
    try {
      const parsed = JSON.parse(pkg.content);
      const deps = { ...parsed.dependencies, ...parsed.devDependencies };
      depCount = Object.keys(deps).length;

      // Detect frameworks
      if (deps['react'] || deps['react-dom']) techStack.push({ name: 'React', category: 'framework' });
      if (deps['vue']) techStack.push({ name: 'Vue', category: 'framework' });
      if (deps['@angular/core']) techStack.push({ name: 'Angular', category: 'framework' });
      if (deps['svelte']) techStack.push({ name: 'Svelte', category: 'framework' });
      if (deps['next']) techStack.push({ name: 'Next.js', category: 'framework' });
      if (deps['express']) techStack.push({ name: 'Express', category: 'framework' });
      if (deps['fastify']) techStack.push({ name: 'Fastify', category: 'framework' });
      if (deps['nestjs'] || deps['@nestjs/core']) techStack.push({ name: 'NestJS', category: 'framework' });

      // Tools
      if (deps['typescript']) techStack.push({ name: 'TypeScript', category: 'language' });
      if (deps['tailwindcss']) techStack.push({ name: 'Tailwind CSS', category: 'tool' });
      if (deps['webpack']) techStack.push({ name: 'Webpack', category: 'tool' });
      if (deps['vite']) techStack.push({ name: 'Vite', category: 'tool' });
      if (deps['jest'] || deps['vitest'] || deps['mocha']) techStack.push({ name: 'Test Framework', category: 'tool' });
    } catch {
      // Invalid JSON
    }
  }

  // Detect from other manifests
  if (treePaths.has('Cargo.toml')) techStack.push({ name: 'Rust', category: 'language' });
  if (treePaths.has('go.mod')) techStack.push({ name: 'Go', category: 'language' });
  if (treePaths.has('requirements.txt') || treePaths.has('pyproject.toml') || treePaths.has('Pipfile')) {
    techStack.push({ name: 'Python', category: 'language' });
  }
  if (treePaths.has('Gemfile')) techStack.push({ name: 'Ruby', category: 'language' });
  if (treePaths.has('composer.json')) techStack.push({ name: 'PHP', category: 'language' });
  if (treePaths.has('pom.xml') || treePaths.has('build.gradle') || treePaths.has('build.gradle.kts')) {
    techStack.push({ name: 'Java/JVM', category: 'language' });
  }
  if (treePaths.has('Dockerfile')) techStack.push({ name: 'Docker', category: 'platform' });
  if (treePaths.has('tsconfig.json') && !techStack.some((t) => t.name === 'TypeScript')) {
    techStack.push({ name: 'TypeScript', category: 'language' });
  }

  signals.push({
    name: 'Dependencies tracked',
    found: depCount > 0,
    details: depCount > 0 ? `${depCount} dependencies` : undefined,
  });

  // Reasonable dependency count (not bloated)
  const reasonable = depCount < 200;
  signals.push({
    name: 'Reasonable dependency count',
    found: reasonable,
    details: depCount > 0 ? `${depCount} total` : undefined,
  });

  let score = 0;
  if (manifests.length > 0) score += 30;
  if (lockfiles.length > 0) score += 25;
  if (depCount > 0) score += 20;
  if (reasonable) score += 15;
  if (techStack.length > 0) score += 10;

  return {
    result: {
      key: 'dependencies',
      label: 'Dependencies',
      score: Math.min(100, score),
      weight: 0.15,
      signals,
    },
    techStack,
  };
}
