import { useReducer, useCallback } from 'react';
import type { RateLimitInfo } from '../types';
import type { TechDetectState, TechDetectStep, TechDetectResult } from '../types/techDetect';
import type { GitHubRepoResponse } from '../services/github/types';
import { githubFetch } from '../services/github/client';
import { fetchTree } from '../services/github/tree';
import { fetchFileContents } from '../services/github/contents';
import {
  detectAWS,
  detectPython,
  detectAzure,
  detectGCP,
  detectGo,
  detectJava,
  detectNode,
  detectPHP,
  detectRust,
  detectRuby,
  filterTechFiles,
} from '../services/analysis/techDetectEngine';
import { useApp } from '../context/AppContext';

type Action =
  | { type: 'RESET' }
  | { type: 'SET_STEP'; step: TechDetectStep; progress: number; message: string }
  | { type: 'FILE_PROGRESS'; fetched: number; total: number }
  | { type: 'DONE'; result: TechDetectResult }
  | { type: 'ERROR'; error: string };

const initialState: TechDetectState = {
  step: 'idle',
  progress: 0,
  statusMessage: '',
  result: null,
  error: null,
};

function reducer(state: TechDetectState, action: Action): TechDetectState {
  switch (action.type) {
    case 'RESET':
      return initialState;
    case 'SET_STEP':
      return {
        ...state,
        step: action.step,
        progress: action.progress,
        statusMessage: action.message,
        error: null,
      };
    case 'FILE_PROGRESS': {
      const pct = 20 + Math.round((action.fetched / action.total) * 50);
      return {
        ...state,
        progress: pct,
        statusMessage: `Fetching files... ${action.fetched}/${action.total}`,
      };
    }
    case 'DONE':
      return {
        ...state,
        step: 'done',
        progress: 100,
        statusMessage: 'Analysis complete',
        result: action.result,
      };
    case 'ERROR':
      return {
        ...state,
        step: 'error',
        error: action.error,
        statusMessage: '',
      };
    default:
      return state;
  }
}

function parseOwnerRepo(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim();

  const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };
  }

  const shortMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] };
  }

  return null;
}

export function useTechDetect() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { state: appState, dispatch: appDispatch } = useApp();

  const handleRateLimit = useCallback(
    (info: RateLimitInfo) => {
      appDispatch({ type: 'SET_RATE_LIMIT', info });
    },
    [appDispatch],
  );

  const analyze = useCallback(
    async (input: string) => {
      const parsed = parseOwnerRepo(input);
      if (!parsed) {
        dispatch({ type: 'ERROR', error: 'Invalid repo format. Use owner/repo or a GitHub URL.' });
        return;
      }

      const token = appState.githubToken || undefined;
      const { owner, repo } = parsed;

      try {
        // 1. Fetch repo info for default branch
        dispatch({
          type: 'SET_STEP',
          step: 'fetching-tree',
          progress: 5,
          message: 'Fetching repository info...',
        });
        const repoInfo = await githubFetch<GitHubRepoResponse>(
          `/repos/${owner}/${repo}`,
          token,
          handleRateLimit,
        );
        const branch = repoInfo.default_branch;

        // 2. Fetch recursive tree
        dispatch({
          type: 'SET_STEP',
          step: 'fetching-tree',
          progress: 10,
          message: 'Fetching file tree...',
        });
        const tree = await fetchTree(owner, repo, branch, token, handleRateLimit);

        // 3. Filter to tech-relevant files
        const techPaths = filterTechFiles(tree);
        if (techPaths.length === 0) {
          dispatch({
            type: 'DONE',
            result: {
              aws: [],
              azure: [],
              gcp: [],
              python: [],
              node: [],
              go: [],
              java: [],
              php: [],
              rust: [],
              ruby: [],
              manifestFiles: [],
            },
          });
          return;
        }

        // 4. Fetch file contents
        dispatch({
          type: 'SET_STEP',
          step: 'fetching-files',
          progress: 20,
          message: `Fetching ${techPaths.length} files...`,
        });
        let fetched = 0;
        const files = await fetchFileContents(
          owner,
          repo,
          branch,
          techPaths,
          token,
          handleRateLimit,
          () => {
            fetched++;
            dispatch({ type: 'FILE_PROGRESS', fetched, total: techPaths.length });
          },
        );

        // 5. Run analysis
        dispatch({
          type: 'SET_STEP',
          step: 'analyzing',
          progress: 80,
          message: 'Analyzing technologies...',
        });
        await new Promise((resolve) => setTimeout(resolve, 10));

        const fileInputs = files.map((f) => ({ path: f.path, content: f.content }));
        const aws = detectAWS(fileInputs);
        const azure = detectAzure(fileInputs);
        const gcp = detectGCP(fileInputs);
        const python = detectPython(fileInputs);
        const node = detectNode(fileInputs);
        const go = detectGo(fileInputs);
        const java = detectJava(fileInputs);
        const php = detectPHP(fileInputs);
        const rust = detectRust(fileInputs);
        const ruby = detectRuby(fileInputs);

        dispatch({
          type: 'DONE',
          result: {
            aws,
            azure,
            gcp,
            python,
            node,
            go,
            java,
            php,
            rust,
            ruby,
            manifestFiles: files.map((f) => f.path),
          },
        });
      } catch (err) {
        dispatch({
          type: 'ERROR',
          error: err instanceof Error ? err.message : 'An unexpected error occurred.',
        });
      }
    },
    [appState.githubToken, handleRateLimit],
  );

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return { state, analyze, reset };
}
