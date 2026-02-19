import type { RepoInfo, RateLimitInfo } from '../../types';
import type { GitHubRepoResponse } from './types';
import { githubFetch } from './client';

function mapToRepoInfo(raw: GitHubRepoResponse): RepoInfo {
  return {
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
}

export async function fetchOrgRepos(
  org: string,
  token?: string,
  onRateLimit?: (info: RateLimitInfo) => void
): Promise<RepoInfo[]> {
  const raw = await githubFetch<GitHubRepoResponse[]>(
    `/orgs/${encodeURIComponent(org)}/repos?per_page=100&sort=updated`,
    token,
    onRateLimit
  );
  return raw.map(mapToRepoInfo);
}

export async function fetchUserRepos(
  username: string,
  token?: string,
  onRateLimit?: (info: RateLimitInfo) => void
): Promise<RepoInfo[]> {
  const raw = await githubFetch<GitHubRepoResponse[]>(
    `/users/${encodeURIComponent(username)}/repos?per_page=30&sort=updated&type=owner`,
    token,
    onRateLimit
  );
  return raw.map(mapToRepoInfo);
}
