import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useAnalysisContext } from '../context/AnalysisContext';
import { parseRepoUrl } from '../services/github/parser';
import { githubFetch } from '../services/github/client';
import { fetchTree } from '../services/github/tree';
import { filterTargetFiles, fetchFileContents } from '../services/github/contents';
import { runAnalysis } from '../services/analysis/engine';
import { enrichWithLlm } from '../services/llm/client';
import { saveReport } from '../services/persistence/repoCache';
import { addHistoryEntry } from '../services/persistence/history';
import type { GitHubRepoResponse } from '../services/github/types';
import type { RepoInfo, CategoryKey } from '../types';

export function useAnalysis() {
  const { state: appState, dispatch: appDispatch, addRecentRepo } = useApp();
  const { state: analysisState, dispatch } = useAnalysisContext();

  const analyze = useCallback(async (input: string) => {
    dispatch({ type: 'RESET' });

    // Step 1: Parse URL
    dispatch({ type: 'SET_STEP', step: 'parsing', progress: 5 });
    const parsed = parseRepoUrl(input);
    if (!parsed) {
      dispatch({ type: 'SET_ERROR', error: 'Invalid GitHub URL. Try: owner/repo or https://github.com/owner/repo' });
      return;
    }

    const token = appState.githubToken || undefined;
    const onRateLimit = (info: typeof appState.rateLimit) => {
      if (info) appDispatch({ type: 'SET_RATE_LIMIT', info });
    };

    try {
      // Step 2: Fetch repo info
      dispatch({ type: 'SET_STEP', step: 'fetching-info', progress: 10 });
      const raw = await githubFetch<GitHubRepoResponse>(
        `/repos/${parsed.owner}/${parsed.repo}`,
        token,
        onRateLimit
      );

      const repoInfo: RepoInfo = {
        owner: raw.full_name.split('/')[0],
        repo: raw.name,
        defaultBranch: raw.default_branch,
        description: raw.description || '',
        stars: raw.stargazers_count,
        forks: raw.forks_count,
        openIssues: raw.open_issues_count,
        license: raw.license?.spdx_id || null,
        language: raw.language,
        createdAt: raw.created_at,
        updatedAt: raw.updated_at,
        topics: raw.topics || [],
        archived: raw.archived,
        size: raw.size,
      };

      const branch = parsed.branch || repoInfo.defaultBranch;

      // Step 3: Fetch tree
      dispatch({ type: 'SET_STEP', step: 'fetching-tree', progress: 25 });
      const tree = await fetchTree(parsed.owner, parsed.repo, branch, token, onRateLimit);

      // Step 4: Filter target files
      const targetFiles = filterTargetFiles(tree);
      dispatch({ type: 'SET_FILES_TOTAL', total: targetFiles.length });

      // Step 5: Fetch file contents
      dispatch({ type: 'SET_STEP', step: 'fetching-files', progress: 35 });
      const files = await fetchFileContents(
        parsed.owner,
        parsed.repo,
        branch,
        targetFiles,
        token,
        onRateLimit,
        () => {
          dispatch({ type: 'INCREMENT_FILES_FETCHED' });
        }
      );

      // Step 6: Run analysis
      dispatch({ type: 'SET_STEP', step: 'analyzing', progress: 80 });
      let report = runAnalysis(
        { ...parsed, branch },
        repoInfo,
        tree,
        files
      );

      // Step 7: Optional LLM enrichment
      if (appState.settings.llmMode === 'enriched' && appState.anthropicKey) {
        dispatch({ type: 'SET_STEP', step: 'llm-enrichment', progress: 90 });
        try {
          const insights = await enrichWithLlm(report, appState.anthropicKey);
          report = { ...report, llmInsights: insights };
        } catch (err) {
          // LLM enrichment is optional — don't fail the whole analysis
          console.warn('LLM enrichment failed:', err);
        }
      }

      // Step 8: Cache and finish
      dispatch({ type: 'SET_REPORT', report });

      // Persist
      try {
        await saveReport(report);
        addRecentRepo({
          owner: parsed.owner,
          repo: parsed.repo,
          grade: report.grade,
          analyzedAt: report.analyzedAt,
          overallScore: report.overallScore,
        });
        // Save history entry for trend tracking
        const categoryScores = {} as Record<CategoryKey, number>;
        for (const cat of report.categories) {
          categoryScores[cat.key] = cat.score;
        }
        addHistoryEntry({
          owner: parsed.owner,
          repo: parsed.repo,
          overallScore: report.overallScore,
          grade: report.grade,
          categoryScores,
          analyzedAt: report.analyzedAt,
        });
      } catch {
        // Persistence is optional
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      dispatch({ type: 'SET_ERROR', error: message });
    }
  }, [appState.githubToken, appState.anthropicKey, appState.settings.llmMode, appDispatch, dispatch, addRecentRepo]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  return { state: analysisState, analyze, reset };
}
