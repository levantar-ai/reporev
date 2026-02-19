import type { FileContent, TreeEntry, RateLimitInfo } from '../../types';
import type { GitHubContentResponse } from './types';
import { githubFetch } from './client';
import { decodeBase64 } from '../../utils/base64';
import {
  TARGET_FILES,
  WORKFLOW_DIR,
  ISSUE_TEMPLATE_DIR,
  PR_TEMPLATE,
  PR_TEMPLATE_ALT,
  FETCH_DELAY_MS,
  MAX_FILES_TO_FETCH,
} from '../../utils/constants';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function filterTargetFiles(tree: TreeEntry[]): string[] {
  // Separate priority: exact target files first, then dynamic matches
  const exactMatches: string[] = [];
  const dynamicMatches: string[] = [];

  for (const entry of tree) {
    if (entry.type !== 'blob') continue;

    // Exact matches (high priority — config files, manifests, READMEs)
    if (TARGET_FILES.includes(entry.path)) {
      exactMatches.push(entry.path);
      continue;
    }

    // PR template (high priority)
    if (entry.path === PR_TEMPLATE || entry.path === PR_TEMPLATE_ALT) {
      exactMatches.push(entry.path);
      continue;
    }

    // Workflow files (lower priority — cap at 5)
    if (entry.path.startsWith(WORKFLOW_DIR) && (entry.path.endsWith('.yml') || entry.path.endsWith('.yaml'))) {
      dynamicMatches.push(entry.path);
      continue;
    }

    // Issue templates (lower priority — cap at 3)
    if (entry.path.startsWith(ISSUE_TEMPLATE_DIR)) {
      dynamicMatches.push(entry.path);
      continue;
    }

    // CodeQL workflows
    if (entry.path.includes('codeql') && entry.path.endsWith('.yml')) {
      dynamicMatches.push(entry.path);
    }
  }

  // Prioritize exact matches, then fill remaining budget with dynamic matches
  const MAX_WORKFLOWS = 5;
  const MAX_TEMPLATES = 3;
  const workflows = dynamicMatches.filter((p) => p.startsWith(WORKFLOW_DIR)).slice(0, MAX_WORKFLOWS);
  const templates = dynamicMatches.filter((p) => p.startsWith(ISSUE_TEMPLATE_DIR)).slice(0, MAX_TEMPLATES);
  const others = dynamicMatches.filter((p) => !p.startsWith(WORKFLOW_DIR) && !p.startsWith(ISSUE_TEMPLATE_DIR));

  const combined = [...exactMatches, ...workflows, ...templates, ...others];
  return [...new Set(combined)].slice(0, MAX_FILES_TO_FETCH);
}

export async function fetchFileContents(
  owner: string,
  repo: string,
  branch: string,
  filePaths: string[],
  token?: string,
  onRateLimit?: (info: RateLimitInfo) => void,
  onFileProgress?: () => void
): Promise<FileContent[]> {
  const results: FileContent[] = [];

  for (const path of filePaths) {
    try {
      const data = await githubFetch<GitHubContentResponse>(
        `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        token,
        onRateLimit
      );

      if (data.encoding === 'base64' && data.content) {
        results.push({
          path: data.path,
          content: decodeBase64(data.content),
          size: data.size,
        });
      }
    } catch {
      // Skip files that fail to fetch (may be too large, etc.)
    }

    onFileProgress?.();

    if (filePaths.indexOf(path) < filePaths.length - 1) {
      await delay(FETCH_DELAY_MS);
    }
  }

  return results;
}
