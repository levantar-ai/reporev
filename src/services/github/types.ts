export interface GitHubRepoResponse {
  name: string;
  full_name: string;
  default_branch: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  license: { spdx_id: string; name: string } | null;
  language: string | null;
  created_at: string;
  updated_at: string;
  topics: string[];
  archived: boolean;
  size: number;
}

export interface GitHubTreeResponse {
  sha: string;
  tree: GitHubTreeEntry[];
  truncated: boolean;
}

export interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

export interface GitHubContentResponse {
  name: string;
  path: string;
  content: string;
  encoding: string;
  size: number;
}
