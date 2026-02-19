import type { CategoryResult, FileContent, TreeEntry, Signal } from '../../types';

export function analyzeDocumentation(
  files: FileContent[],
  tree: TreeEntry[]
): CategoryResult {
  const signals: Signal[] = [];
  const fileMap = new Map(files.map((f) => [f.path, f]));

  // README exists
  const readme = fileMap.get('README.md') || fileMap.get('readme.md') || fileMap.get('README.rst');
  signals.push({ name: 'README exists', found: !!readme });

  // README quality (length-based heuristic)
  const readmeLength = readme?.content.length ?? 0;
  const hasSubstantialReadme = readmeLength > 500;
  signals.push({
    name: 'Substantial README (>500 chars)',
    found: hasSubstantialReadme,
    details: readme ? `${readmeLength} characters` : undefined,
  });

  // README has sections (headers)
  const readmeHeaders = readme?.content.match(/^#{1,3}\s+/gm)?.length ?? 0;
  signals.push({
    name: 'README has sections',
    found: readmeHeaders >= 3,
    details: `${readmeHeaders} headers found`,
  });

  // README has code examples
  const hasCodeBlocks = /```[\s\S]*?```/.test(readme?.content ?? '');
  signals.push({ name: 'Code examples in README', found: hasCodeBlocks });

  // CONTRIBUTING.md
  signals.push({
    name: 'CONTRIBUTING.md',
    found: fileMap.has('CONTRIBUTING.md'),
  });

  // CHANGELOG or similar
  const hasChangelog = fileMap.has('CHANGELOG.md') || fileMap.has('CHANGES.md') || fileMap.has('HISTORY.md');
  signals.push({ name: 'CHANGELOG', found: hasChangelog });

  // docs/ directory
  const hasDocs = tree.some((e) => e.type === 'tree' && (e.path === 'docs' || e.path === 'doc'));
  signals.push({ name: 'docs/ directory', found: hasDocs });

  // Calculate score
  let score = 0;
  if (readme) score += 25;
  if (hasSubstantialReadme) score += 20;
  if (readmeHeaders >= 3) score += 15;
  if (hasCodeBlocks) score += 10;
  if (fileMap.has('CONTRIBUTING.md')) score += 10;
  if (hasChangelog) score += 10;
  if (hasDocs) score += 10;

  return {
    key: 'documentation',
    label: 'Documentation',
    score: Math.min(100, score),
    weight: 0.20,
    signals,
  };
}
