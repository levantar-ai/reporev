import type { CategoryResult, FileContent, TreeEntry, Signal } from '../../types';
import { ISSUE_TEMPLATE_DIR, PR_TEMPLATE, PR_TEMPLATE_ALT } from '../../utils/constants';

export function analyzeCommunity(
  files: FileContent[],
  tree: TreeEntry[]
): CategoryResult {
  const signals: Signal[] = [];
  const fileMap = new Map(files.map((f) => [f.path, f]));
  const treePaths = new Set(tree.map((e) => e.path));

  // Issue templates
  const issueTemplates = tree.filter(
    (e) => e.type === 'blob' && e.path.startsWith(ISSUE_TEMPLATE_DIR)
  );
  signals.push({
    name: 'Issue templates',
    found: issueTemplates.length > 0,
    details: `${issueTemplates.length} template(s)`,
  });

  // PR template
  const hasPRTemplate = treePaths.has(PR_TEMPLATE) || treePaths.has(PR_TEMPLATE_ALT) ||
    treePaths.has('.github/PULL_REQUEST_TEMPLATE.md') || treePaths.has('PULL_REQUEST_TEMPLATE.md');
  signals.push({ name: 'PR template', found: hasPRTemplate });

  // Code of Conduct
  const hasCOC =
    fileMap.has('CODE_OF_CONDUCT.md') || fileMap.has('.github/CODE_OF_CONDUCT.md') ||
    treePaths.has('CODE_OF_CONDUCT.md') || treePaths.has('.github/CODE_OF_CONDUCT.md');
  signals.push({ name: 'Code of Conduct', found: hasCOC });

  // CONTRIBUTING.md
  const hasContributing = fileMap.has('CONTRIBUTING.md') || treePaths.has('CONTRIBUTING.md');
  signals.push({ name: 'CONTRIBUTING.md', found: hasContributing });

  // FUNDING
  const hasFunding = fileMap.has('.github/FUNDING.yml') || treePaths.has('.github/FUNDING.yml');
  signals.push({ name: 'Funding configuration', found: hasFunding });

  // SUPPORT.md
  const hasSupport = fileMap.has('.github/SUPPORT.md') || treePaths.has('.github/SUPPORT.md') ||
    treePaths.has('SUPPORT.md');
  signals.push({ name: 'SUPPORT.md', found: hasSupport });

  let score = 0;
  if (issueTemplates.length > 0) score += 20;
  if (hasPRTemplate) score += 20;
  if (hasCOC) score += 20;
  if (hasContributing) score += 20;
  if (hasFunding) score += 10;
  if (hasSupport) score += 10;

  return {
    key: 'community',
    label: 'Community',
    score: Math.min(100, score),
    weight: 0.10,
    signals,
  };
}
