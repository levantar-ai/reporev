import { useState } from 'react';
import type { LetterGrade } from '../../types';
import { useClipboard } from '../../hooks/useClipboard';

interface Props {
  owner: string;
  repo: string;
  grade: LetterGrade;
  score: number;
}

const GRADE_HEX: Record<LetterGrade, string> = {
  A: '#00ff88',
  B: '#a0ff00',
  C: '#ffd000',
  D: '#ff8800',
  F: '#ff3355',
};

type SnippetTab = 'markdown' | 'html' | 'url';

function BadgeSvg({ grade }: { grade: LetterGrade }) {
  const gradeColor = GRADE_HEX[grade];
  const leftWidth = 62;
  const rightWidth = 32;
  const totalWidth = leftWidth + rightWidth;
  const height = 22;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={totalWidth}
      height={height}
      viewBox={`0 0 ${totalWidth} ${height}`}
    >
      <rect width={leftWidth} height={height} rx={4} fill="#555" />
      <rect x={leftWidth} width={rightWidth} height={height} rx={0} fill={gradeColor} />
      <rect x={leftWidth} width={4} height={height} fill={gradeColor} />
      <rect width={totalWidth} height={height} rx={4} fill="transparent" stroke="none" />
      {/* Right side rounded corner only */}
      <rect x={leftWidth} width={rightWidth} height={height} rx={4} fill={gradeColor} />
      <rect x={leftWidth} width={4} height={height} fill={gradeColor} />
      {/* Clean overlap */}
      <rect width={leftWidth + 2} height={height} rx={4} fill="#555" />
      <text
        x={leftWidth / 2}
        y={height / 2}
        dominantBaseline="central"
        textAnchor="middle"
        fill="#fff"
        fontFamily="Verdana, Geneva, sans-serif"
        fontSize={11}
        fontWeight={400}
      >
        RepoRev
      </text>
      <text
        x={leftWidth + rightWidth / 2}
        y={height / 2}
        dominantBaseline="central"
        textAnchor="middle"
        fill={grade === 'C' ? '#333' : '#fff'}
        fontFamily="Verdana, Geneva, sans-serif"
        fontSize={12}
        fontWeight={700}
      >
        {grade}
      </text>
    </svg>
  );
}

export function BadgeGenerator({ owner, repo, grade, score }: Props) {
  const [activeTab, setActiveTab] = useState<SnippetTab>('markdown');
  const { copied, copy } = useClipboard();

  const badgeUrl = `https://reporev.dev/badge/${owner}/${repo}.svg`;
  const repoUrl = `https://reporev.dev/report/${owner}/${repo}`;

  const snippets: Record<SnippetTab, string> = {
    markdown: `[![RepoRev Grade: ${grade}](${badgeUrl})](${repoUrl})`,
    html: `<a href="${repoUrl}"><img src="${badgeUrl}" alt="RepoRev Grade: ${grade}" /></a>`,
    url: badgeUrl,
  };

  const tabs: { key: SnippetTab; label: string }[] = [
    { key: 'markdown', label: 'Markdown' },
    { key: 'html', label: 'HTML' },
    { key: 'url', label: 'URL' },
  ];

  return (
    <div className="rounded-xl border border-border bg-surface-alt p-6">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
        Badge
      </h3>

      {/* Badge preview */}
      <div className="flex items-center gap-4 mb-4 p-4 rounded-lg bg-surface-hover border border-border">
        <BadgeSvg grade={grade} />
        <span className="text-sm text-text-muted">
          {owner}/{repo} — Grade {grade} ({score}/100)
        </span>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-3 border-b border-border"
        role="tablist"
        aria-label="Badge embed format"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-[1px] ${
              activeTab === tab.key
                ? 'text-neon border-neon'
                : 'text-text-muted border-transparent hover:text-text-secondary'
            }`}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={`badge-panel-${tab.key}`}
            id={`badge-tab-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Snippet */}
      <div
        className="relative"
        role="tabpanel"
        id={`badge-panel-${activeTab}`}
        aria-labelledby={`badge-tab-${activeTab}`}
      >
        <pre className="p-3 rounded-lg bg-surface-hover border border-border text-xs text-text-secondary overflow-x-auto whitespace-pre-wrap break-all">
          {snippets[activeTab]}
        </pre>
        <button
          onClick={() => copy(snippets[activeTab])}
          className="absolute top-2 right-2 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-surface-alt hover:bg-surface-hover hover:border-neon/30 text-text-secondary transition-all"
          aria-label={`Copy ${activeTab} badge code`}
        >
          {copied ? (
            <span className="text-grade-a" role="status">
              Copied!
            </span>
          ) : (
            'Copy'
          )}
        </button>
      </div>
    </div>
  );
}
