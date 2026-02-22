import { useReducer, useCallback } from 'react';
import type { GitStatsState, GitStatsStep } from '../types/gitStats';
import { cloneAndExtract } from '../services/git/cloneService';
import { analyzeGitStats } from '../services/analysis/gitStatsAnalyzer';
import { invalidateIfDifferent } from '../services/git/repoCache';
import { useApp } from '../context/AppContext';
import { humanizeCloneError, formatHumanizedError } from '../utils/humanizeError';
import { trackEvent } from '../utils/analytics';

type Action =
  | { type: 'RESET' }
  | { type: 'SET_STEP'; step: GitStatsStep; progress: number; message: string }
  | { type: 'CLONE_PROGRESS'; step: string; percent: number; subPercent: number; message: string }
  | { type: 'DONE'; analysis: GitStatsState['analysis']; rawData: GitStatsState['rawData'] }
  | { type: 'ERROR'; error: string };

const initialState: GitStatsState = {
  step: 'idle',
  progress: 0,
  subProgress: 0,
  commitsFetched: 0,
  detailsFetched: 0,
  statusMessage: '',
  rawData: null,
  analysis: null,
  error: null,
};

function reducer(state: GitStatsState, action: Action): GitStatsState {
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
    case 'CLONE_PROGRESS':
      return {
        ...state,
        step: action.step as GitStatsStep,
        progress: action.percent,
        subProgress: action.subPercent,
        statusMessage: action.message,
        error: null,
      };
    case 'DONE':
      return {
        ...state,
        step: 'done',
        progress: 100,
        statusMessage: 'Analysis complete',
        rawData: action.rawData,
        analysis: action.analysis,
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

  // Full URL: https://github.com/owner/repo
  const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };
  }

  // Shorthand: owner/repo
  const shortMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] };
  }

  return null;
}

export function useGitStats() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { state: appState } = useApp();

  const analyze = useCallback(
    async (input: string) => {
      const parsed = parseOwnerRepo(input);
      if (!parsed) {
        dispatch({ type: 'ERROR', error: 'Invalid repo format. Use owner/repo or a GitHub URL.' });
        return;
      }

      const token = appState.githubToken || undefined;
      const { owner, repo } = parsed;
      const startTime = performance.now();

      trackEvent('analysis_start', {
        tool: 'git-stats',
        repo: `${owner}/${repo}`,
        has_token: !!token,
      });

      // Invalidate cache if different repo
      invalidateIfDifferent(owner, repo);

      // Try clone-first approach (no token needed for public repos)
      dispatch({
        type: 'SET_STEP',
        step: 'cloning',
        progress: 0,
        message: 'Cloning repository...',
      });

      let rawData;

      try {
        rawData = await cloneAndExtract(
          owner,
          repo,
          (step, percent, subPercent, message) => {
            dispatch({ type: 'CLONE_PROGRESS', step, percent, subPercent, message });
          },
          token,
        );
      } catch (cloneErr) {
        const msg = cloneErr instanceof Error ? cloneErr.message : 'Unknown error';
        const humanized = humanizeCloneError(msg);
        trackEvent('analysis_error', {
          tool: 'git-stats',
          repo: `${owner}/${repo}`,
          error_type: humanized.title.includes('too large')
            ? 'storage'
            : humanized.title.includes('timed out')
              ? 'timeout'
              : humanized.title.includes('not found')
                ? 'not-found'
                : humanized.title.includes('rate limit')
                  ? 'rate-limit'
                  : humanized.title.includes('invalid')
                    ? 'auth'
                    : 'unknown',
          browser: navigator.userAgent,
        });
        dispatch({ type: 'ERROR', error: formatHumanizedError(humanized) });
        return;
      }

      dispatch({
        type: 'SET_STEP',
        step: 'analyzing',
        progress: 88,
        message: 'Analyzing data...',
      });

      // Run analysis (synchronous, but we yield the event loop)
      await new Promise((resolve) => setTimeout(resolve, 10));
      const analysis = analyzeGitStats(rawData, owner, repo);

      const duration = Math.round(performance.now() - startTime);
      trackEvent('analysis_complete', {
        tool: 'git-stats',
        repo: `${owner}/${repo}`,
        duration_ms: duration,
        has_token: !!token,
      });

      dispatch({ type: 'DONE', analysis, rawData });
    },
    [appState.githubToken],
  );

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return { state, analyze, reset };
}
