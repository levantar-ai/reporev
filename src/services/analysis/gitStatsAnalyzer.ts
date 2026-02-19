import type {
  GitStatsRawData,
  GitStatsAnalysis,
  ContributorSummary,
  BusFactorData,
  FileChurnEntry,
  CommitMessageStats,
  CommitSizeDistribution,
  RepoGrowthPoint,
  PunchCardData,
  WeeklyActivity,
  LanguageEntry,
} from '../../types/gitStats';

// ── Stopwords for word frequency ──

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'that', 'this', 'was', 'are',
  'be', 'has', 'had', 'have', 'not', 'as', 'we', 'do', 'if', 'so',
  'no', 'up', 'out', 'all', 'can', 'will', 'just', 'into', 'when',
  'been', 'some', 'than', 'its', 'also', 'more', 'use', 'new', 'get',
  'set', 'only', 'should', 'would', 'could', 'about', 'which', 'each',
  'make', 'like', 'them', 'then', 'now', 'any', 'my', 'our', 'their',
  'other', 'these', 'those', 'may', 'using',
]);

// ── Contributor Summary ──

function buildContributorSummary(raw: GitStatsRawData): ContributorSummary[] {
  if (!raw.contributorStats || raw.contributorStats.length === 0) {
    // Fall back to commit list data
    const authorMap = new Map<string, { commits: number; login: string; avatar: string }>();
    for (const c of raw.commits) {
      const login = c.author?.login || c.commit.author.name;
      const avatar = c.author?.avatar_url || '';
      const entry = authorMap.get(login) || { commits: 0, login, avatar };
      entry.commits++;
      authorMap.set(login, entry);
    }

    const totalCommits = raw.commits.length;
    return Array.from(authorMap.values())
      .map((a) => ({
        login: a.login,
        avatarUrl: a.avatar,
        totalCommits: a.commits,
        totalAdditions: 0,
        totalDeletions: 0,
        commitPercentage: totalCommits > 0 ? (a.commits / totalCommits) * 100 : 0,
        firstCommitWeek: 0,
        lastCommitWeek: 0,
      }))
      .sort((a, b) => b.totalCommits - a.totalCommits);
  }

  const totalCommits = raw.contributorStats.reduce((sum, c) => sum + c.total, 0);

  return raw.contributorStats
    .map((c) => {
      const additions = c.weeks.reduce((sum, w) => sum + w.a, 0);
      const deletions = c.weeks.reduce((sum, w) => sum + w.d, 0);
      const activeWeeks = c.weeks.filter((w) => w.c > 0);
      const firstWeek = activeWeeks.length > 0 ? activeWeeks[0].w : 0;
      const lastWeek = activeWeeks.length > 0 ? activeWeeks[activeWeeks.length - 1].w : 0;

      return {
        login: c.author.login,
        avatarUrl: c.author.avatar_url,
        totalCommits: c.total,
        totalAdditions: additions,
        totalDeletions: deletions,
        commitPercentage: totalCommits > 0 ? (c.total / totalCommits) * 100 : 0,
        firstCommitWeek: firstWeek,
        lastCommitWeek: lastWeek,
      };
    })
    .sort((a, b) => b.totalCommits - a.totalCommits);
}

// ── Bus Factor ──

function computeBusFactor(contributors: ContributorSummary[]): BusFactorData {
  if (contributors.length === 0) {
    return { busFactor: 0, herfindahlIndex: 0, cumulativeContributors: [] };
  }

  // Sort by commits descending
  const sorted = [...contributors].sort((a, b) => b.commitPercentage - a.commitPercentage);

  // Walk cumulative percentage until >= 50%
  let cumulative = 0;
  let busFactor = 0;
  const cumulativeContributors: { login: string; cumulativePercentage: number }[] = [];

  for (const c of sorted) {
    cumulative += c.commitPercentage;
    busFactor++;
    cumulativeContributors.push({
      login: c.login,
      cumulativePercentage: cumulative,
    });
    if (cumulative >= 50) break;
  }

  // Add remaining contributors for full curve
  for (let i = busFactor; i < sorted.length; i++) {
    cumulative += sorted[i].commitPercentage;
    cumulativeContributors.push({
      login: sorted[i].login,
      cumulativePercentage: cumulative,
    });
  }

  // Herfindahl-Hirschman Index
  const herfindahlIndex = contributors.reduce(
    (sum, c) => sum + Math.pow(c.commitPercentage / 100, 2),
    0,
  );

  return { busFactor, herfindahlIndex, cumulativeContributors };
}

// ── File Churn ──

function buildFileChurn(raw: GitStatsRawData): FileChurnEntry[] {
  if (raw.commitDetails.length === 0) return [];

  const fileMap = new Map<string, FileChurnEntry>();

  for (const detail of raw.commitDetails) {
    if (!detail.files) continue;
    const authorLogin = detail.author?.login || detail.commit.author.name;

    for (const file of detail.files) {
      const existing = fileMap.get(file.filename);
      if (existing) {
        existing.changeCount++;
        existing.totalAdditions += file.additions;
        existing.totalDeletions += file.deletions;
        if (!existing.contributors.includes(authorLogin)) {
          existing.contributors.push(authorLogin);
        }
      } else {
        fileMap.set(file.filename, {
          filename: file.filename,
          changeCount: 1,
          totalAdditions: file.additions,
          totalDeletions: file.deletions,
          contributors: [authorLogin],
        });
      }
    }
  }

  return Array.from(fileMap.values())
    .sort((a, b) => b.changeCount - a.changeCount)
    .slice(0, 100);
}

// ── Commit Message Analysis ──

function analyzeCommitMessages(raw: GitStatsRawData): CommitMessageStats {
  const messages = raw.commits.map((c) => c.commit.message);
  const totalCommits = messages.length;

  if (totalCommits === 0) {
    return {
      totalCommits: 0,
      averageLength: 0,
      medianLength: 0,
      mergeCommitCount: 0,
      conventionalCommits: {
        feat: 0, fix: 0, docs: 0, style: 0, refactor: 0,
        test: 0, chore: 0, ci: 0, perf: 0, build: 0, other: 0,
      },
      conventionalPercentage: 0,
      wordFrequency: [],
    };
  }

  // Lengths
  const lengths = messages.map((m) => m.length);
  const averageLength = Math.round(lengths.reduce((a, b) => a + b, 0) / totalCommits);
  const sortedLengths = [...lengths].sort((a, b) => a - b);
  const medianLength = sortedLengths[Math.floor(sortedLengths.length / 2)];

  // Merge commits
  const mergeCommitCount = messages.filter(
    (m) => m.startsWith('Merge ') || m.startsWith('Merge pull request'),
  ).length;

  // Conventional commits
  const conventionalTypes: Record<string, keyof CommitMessageStats['conventionalCommits']> = {
    feat: 'feat',
    fix: 'fix',
    docs: 'docs',
    style: 'style',
    refactor: 'refactor',
    test: 'test',
    chore: 'chore',
    ci: 'ci',
    perf: 'perf',
    build: 'build',
  };

  const conventional: CommitMessageStats['conventionalCommits'] = {
    feat: 0, fix: 0, docs: 0, style: 0, refactor: 0,
    test: 0, chore: 0, ci: 0, perf: 0, build: 0, other: 0,
  };

  let conventionalCount = 0;
  for (const msg of messages) {
    const match = msg.match(/^(\w+)(?:\(.*?\))?!?:/);
    if (match) {
      const type = match[1].toLowerCase();
      if (type in conventionalTypes) {
        conventional[conventionalTypes[type]]++;
      } else {
        conventional.other++;
      }
      conventionalCount++;
    }
  }

  const conventionalPercentage = totalCommits > 0
    ? Math.round((conventionalCount / totalCommits) * 100)
    : 0;

  // Word frequency
  const wordCounts = new Map<string, number>();
  for (const msg of messages) {
    // Take first line only
    const firstLine = msg.split('\n')[0];
    // Remove conventional commit prefix
    const cleaned = firstLine.replace(/^\w+(?:\(.*?\))?!?:\s*/, '');
    const words = cleaned.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    for (const word of words) {
      if (!STOPWORDS.has(word)) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
  }

  const wordFrequency = Array.from(wordCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 80);

  return {
    totalCommits,
    averageLength,
    medianLength,
    mergeCommitCount,
    conventionalCommits: conventional,
    conventionalPercentage,
    wordFrequency,
  };
}

// ── Commit Size Distribution ──

function buildCommitSizeDistribution(raw: GitStatsRawData): CommitSizeDistribution {
  const bucketDefs = [
    { label: '0', min: 0, max: 0 },
    { label: '1-10', min: 1, max: 10 },
    { label: '11-50', min: 11, max: 50 },
    { label: '51-100', min: 51, max: 100 },
    { label: '101-500', min: 101, max: 500 },
    { label: '501-1000', min: 501, max: 1000 },
    { label: '1000+', min: 1001, max: Infinity },
  ];

  const buckets = bucketDefs.map((d) => ({ ...d, count: 0 }));

  for (const detail of raw.commitDetails) {
    const size = detail.stats.additions + detail.stats.deletions;
    for (const bucket of buckets) {
      if (size >= bucket.min && size <= bucket.max) {
        bucket.count++;
        break;
      }
    }
  }

  return { buckets };
}

// ── Repo Growth ──

function buildRepoGrowth(raw: GitStatsRawData): RepoGrowthPoint[] {
  if (!raw.codeFrequency || raw.codeFrequency.length === 0) return [];

  let cumulativeAdditions = 0;
  let cumulativeDeletions = 0;

  return raw.codeFrequency.map(([timestamp, additions, deletions]) => {
    cumulativeAdditions += additions;
    cumulativeDeletions += Math.abs(deletions);
    return {
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      cumulativeAdditions,
      cumulativeDeletions,
      netGrowth: cumulativeAdditions - cumulativeDeletions,
    };
  });
}

// ── Punch Card ──

function buildPunchCard(raw: GitStatsRawData): PunchCardData[] {
  if (!raw.punchCard || raw.punchCard.length === 0) return [];

  return raw.punchCard.map(([day, hour, commits]) => ({
    day,
    hour,
    commits,
  }));
}

// ── Weekly Activity ──

function buildWeeklyActivity(raw: GitStatsRawData): WeeklyActivity[] {
  if (!raw.commitActivity || raw.commitActivity.length === 0) return [];

  return raw.commitActivity.map((week) => ({
    weekStart: new Date(week.week * 1000).toISOString().split('T')[0],
    total: week.total,
    days: week.days,
  }));
}

// ── Language Breakdown ──

function buildLanguageBreakdown(raw: GitStatsRawData): LanguageEntry[] {
  if (!raw.languages) return [];

  const entries = Object.entries(raw.languages);
  const totalBytes = entries.reduce((sum, [, bytes]) => sum + bytes, 0);

  if (totalBytes === 0) return [];

  return entries
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: Math.round((bytes / totalBytes) * 1000) / 10,
    }))
    .sort((a, b) => b.bytes - a.bytes);
}

// ── Main analysis function ──

export function analyzeGitStats(
  rawData: GitStatsRawData,
  owner: string,
  repo: string,
): GitStatsAnalysis {
  const contributors = buildContributorSummary(rawData);
  const busFactor = computeBusFactor(contributors);
  const fileChurn = buildFileChurn(rawData);
  const commitMessages = analyzeCommitMessages(rawData);
  const commitSizeDistribution = buildCommitSizeDistribution(rawData);
  const repoGrowth = buildRepoGrowth(rawData);
  const punchCard = buildPunchCard(rawData);
  const weeklyActivity = buildWeeklyActivity(rawData);
  const languages = buildLanguageBreakdown(rawData);

  return {
    owner,
    repo,
    totalCommits: rawData.commits.length,
    contributors,
    busFactor,
    fileChurn,
    commitMessages,
    commitSizeDistribution,
    repoGrowth,
    punchCard,
    weeklyActivity,
    languages,
    commitActivity: rawData.commitActivity,
    codeFrequency: rawData.codeFrequency,
  };
}
