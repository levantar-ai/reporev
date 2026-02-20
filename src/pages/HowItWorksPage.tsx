interface SectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

function Section({ id, title, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-2xl font-bold text-text mb-4 flex items-center gap-3">
        <span className="h-1 w-6 bg-neon rounded-full" />
        {title}
      </h2>
      <div className="text-text-secondary leading-relaxed space-y-4 text-base">{children}</div>
    </section>
  );
}

function CategoryDoc({
  name,
  weight,
  description,
  signals,
}: {
  readonly name: string;
  readonly weight: string;
  readonly description: string;
  readonly signals: string[];
}) {
  return (
    <div className="p-5 rounded-xl bg-surface-alt border border-border">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-lg font-semibold text-text">{name}</h4>
        <span className="text-sm font-medium text-neon px-2.5 py-0.5 rounded-md bg-neon/10 border border-neon/20">
          {weight} weight
        </span>
      </div>
      <p className="text-sm text-text-secondary mb-3">{description}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {signals.map((s) => (
          <div key={s} className="flex items-center gap-2 text-sm text-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-neon/60 shrink-0" />
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  onBack: () => void;
}

export function HowItWorksPage({ onBack }: Props) {
  return (
    <div className="w-full px-8 lg:px-12 xl:px-16 py-10">
      {/* Header */}
      <div className="mb-10">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-neon transition-colors mb-6"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to analyzer
        </button>
        <h1 className="text-4xl lg:text-5xl font-bold text-text">
          How <span className="text-neon neon-text">RepoRev</span> Works
        </h1>
        <p className="text-lg text-text-secondary mt-3 max-w-2xl leading-relaxed">
          A complete guide to the analysis methodology, scoring system, and what each category
          measures.
        </p>
      </div>

      {/* Table of Contents */}
      <nav className="mb-12 p-5 rounded-xl bg-surface-alt border border-border">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
          Contents
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            ['overview', 'Overview'],
            ['pipeline', 'Analysis Pipeline'],
            ['categories', 'The 7 Categories'],
            ['scoring', 'Scoring & Grading'],
            ['github-api', 'GitHub API Usage'],
            ['file-selection', 'File Selection Strategy'],
            ['ai-enrichment', 'AI Enrichment (Optional)'],
            ['privacy', 'Privacy & Security'],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="text-sm text-text-muted hover:text-neon transition-colors py-1"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <div className="space-y-12">
        {/* Overview */}
        <Section id="overview" title="Overview">
          <p>
            RepoRev is a fully client-side tool that analyzes public GitHub repositories for
            engineering best practices. It produces a "report card" with a letter grade (A through
            F) based on 7 categories: documentation, security, CI/CD, dependencies, code quality,
            license, and community health.
          </p>
          <p>
            Everything runs in your browser. RepoRev makes direct calls to the GitHub REST API to
            fetch repository metadata and files, then runs heuristic analysis locally. No data is
            sent to any backend server. The only external call is an optional AI enrichment step
            using the Anthropic API if you provide your own key.
          </p>
          <p>
            The analysis is <strong className="text-text">deterministic</strong> — the same repo
            state will always produce the same score. It is{' '}
            <strong className="text-text">heuristic-based</strong>, meaning it checks for the
            presence of known-good patterns (config files, directory structures, CI workflows)
            rather than executing or evaluating actual code.
          </p>
        </Section>

        {/* Analysis Pipeline */}
        <Section id="pipeline" title="Analysis Pipeline">
          <p>When you enter a GitHub URL, RepoRev executes these steps in sequence:</p>
          <div className="space-y-3 mt-2">
            {[
              {
                step: '1',
                title: 'Parse URL',
                desc: 'Extracts owner, repo name, and optional branch from the input. Supports full URLs (https://github.com/owner/repo), shorthand (owner/repo), and branch-specific URLs (/tree/branch).',
              },
              {
                step: '2',
                title: 'Fetch Repository Info',
                desc: 'One API call to GET /repos/{owner}/{repo}. Returns metadata: default branch, stars, forks, language, license SPDX ID, topics, description, and archive status.',
              },
              {
                step: '3',
                title: 'Fetch Recursive File Tree',
                desc: 'One API call to GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1. Returns every file and directory path in the repo in a single response. This is the key optimization — we get the full manifest without traversing directories.',
              },
              {
                step: '4',
                title: 'Filter Target Files',
                desc: 'A pure function that selects which files to download for content analysis. Prioritizes key config files (README, LICENSE, package.json, CI configs) over dynamic matches (workflow files, issue templates). Caps at 25 files total.',
              },
              {
                step: '5',
                title: 'Fetch File Contents',
                desc: "Sequential API calls to download each selected file. Files are fetched one at a time with a 100ms delay between calls to respect GitHub's abuse detection. Content arrives base64-encoded and is decoded locally.",
              },
              {
                step: '6',
                title: 'Run 7 Analyzers',
                desc: 'Seven pure, synchronous analyzer functions examine the file tree and contents. Each produces a 0-100 score and a list of signals (what was found vs. what was missing). This step does not make any network calls.',
              },
              {
                step: '7',
                title: 'Compute Final Score',
                desc: 'Category scores are combined using a weighted average. The overall score maps to a letter grade. Strengths, risks, and next-step recommendations are generated from the signal data.',
              },
              {
                step: '8',
                title: 'AI Enrichment (Optional)',
                desc: 'If enabled, sends the analysis summary to the Anthropic API using your key. Returns an executive summary, risk analysis, and actionable recommendations. This is the only step that sends data outside your browser.',
              },
              {
                step: '9',
                title: 'Cache & Display',
                desc: 'The report is saved to IndexedDB for offline access. The repo is added to your recent analyses list. The full report card renders with all scores, signals, and visualizations.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-4 p-4 rounded-lg bg-surface-alt border border-border"
              >
                <div className="h-8 w-8 rounded-lg bg-neon/15 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-neon">{item.step}</span>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-text">{item.title}</h4>
                  <p className="text-sm text-text-secondary mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* The 7 Categories */}
        <Section id="categories" title="The 7 Categories">
          <p>
            Each category examines a different aspect of repository health. Scores are based on the
            presence or absence of specific files, configurations, and patterns — called "signals."
            Every signal is binary (found or not found) and contributes a fixed number of points to
            the category score.
          </p>

          <div className="space-y-4 mt-4">
            <CategoryDoc
              name="Documentation"
              weight="20%"
              description="Measures how well the project is documented. Good documentation lowers the barrier for contributors and users."
              signals={[
                'README exists',
                'Substantial README (>500 chars)',
                'README has 3+ section headers',
                'Code examples in README',
                'CONTRIBUTING.md',
                'CHANGELOG / CHANGES',
                'docs/ directory',
              ]}
            />

            <CategoryDoc
              name="Security"
              weight="15%"
              description="Checks for security best practices: vulnerability disclosure, dependency scanning, code review enforcement, and secret hygiene."
              signals={[
                'SECURITY.md',
                'CODEOWNERS file',
                'Dependabot configured',
                'CodeQL / security scanning',
                'PR-triggered workflows',
                '.gitignore present',
                'No exposed secret files',
              ]}
            />

            <CategoryDoc
              name="CI/CD"
              weight="15%"
              description="Evaluates continuous integration and deployment setup. Looks for automated testing, build pipelines, and deployment workflows."
              signals={[
                'GitHub Actions workflows exist',
                'CI workflow (test/build on push/PR)',
                'Deploy / release workflow',
                'PR-triggered checks',
                'Dockerfile',
                'Docker Compose',
                'Makefile',
              ]}
            />

            <CategoryDoc
              name="Dependencies"
              weight="15%"
              description="Analyzes dependency management: manifest files, lockfiles, dependency count, and tech stack detection."
              signals={[
                'Dependency manifest (package.json, Cargo.toml, etc.)',
                'Lockfile present',
                'Dependencies tracked (count)',
                'Reasonable dependency count (<200)',
                'Tech stack detected',
              ]}
            />

            <CategoryDoc
              name="Code Quality"
              weight="15%"
              description="Looks for tooling that enforces code standards: linters, formatters, type systems, testing frameworks, and git hooks."
              signals={[
                'Linter configured (ESLint, Flake8, Clippy, etc.)',
                'Formatter configured (Prettier, rustfmt, etc.)',
                'Type system (TypeScript, etc.)',
                'Git hooks (Husky, pre-commit)',
                'Tests present (test files/directories)',
                'CI runs tests',
                'EditorConfig',
              ]}
            />

            <CategoryDoc
              name="License"
              weight="10%"
              description="Checks for a license file and classifies it. Permissive licenses (MIT, Apache) score highest; copyleft licenses (GPL) score partially; no license scores zero."
              signals={[
                'LICENSE file exists',
                'SPDX license detected by GitHub',
                'Permissive license (MIT, Apache, BSD, ISC)',
                'Copyleft license (GPL, AGPL, LGPL)',
              ]}
            />

            <CategoryDoc
              name="Community"
              weight="10%"
              description="Evaluates community health infrastructure: templates for issues and PRs, code of conduct, contribution guidelines, and funding."
              signals={[
                'Issue templates',
                'PR template',
                'Code of Conduct',
                'CONTRIBUTING.md',
                'Funding configuration',
                'SUPPORT.md',
              ]}
            />
          </div>
        </Section>

        {/* Scoring */}
        <Section id="scoring" title="Scoring & Grading">
          <p>
            Each category produces a score from 0 to 100. The overall score is a{' '}
            <strong className="text-text">weighted average</strong> of all category scores using the
            weights shown above.
          </p>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-text font-semibold">Grade</th>
                  <th className="text-left py-3 px-4 text-text font-semibold">Score Range</th>
                  <th className="text-left py-3 px-4 text-text font-semibold">Meaning</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-grade-a font-bold text-lg">A</td>
                  <td className="py-3 px-4">85 — 100</td>
                  <td className="py-3 px-4">
                    Excellent. Follows nearly all best practices across categories.
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-grade-b font-bold text-lg">B</td>
                  <td className="py-3 px-4">70 — 84</td>
                  <td className="py-3 px-4">
                    Good. Most practices in place with a few areas for improvement.
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-grade-c font-bold text-lg">C</td>
                  <td className="py-3 px-4">55 — 69</td>
                  <td className="py-3 px-4">
                    Fair. Some practices present but significant gaps exist.
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-grade-d font-bold text-lg">D</td>
                  <td className="py-3 px-4">40 — 54</td>
                  <td className="py-3 px-4">Below average. Missing many standard practices.</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-grade-f font-bold text-lg">F</td>
                  <td className="py-3 px-4">0 — 39</td>
                  <td className="py-3 px-4">Poor. Minimal project infrastructure and practices.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4">
            The formula is:{' '}
            <code className="px-2 py-1 rounded bg-surface-alt border border-border text-neon text-sm">
              overall = (doc * 0.20) + (sec * 0.15) + (ci * 0.15) + (deps * 0.15) + (quality * 0.15)
              + (license * 0.10) + (community * 0.10)
            </code>
          </p>
          <p>
            <strong className="text-text">Strengths</strong> are auto-generated from categories
            scoring 80+. <strong className="text-text">Risks</strong> come from categories scoring
            below 40. <strong className="text-text">Next Steps</strong> take the 3 weakest
            categories and suggest adding their first missing signal.
          </p>
        </Section>

        {/* GitHub API */}
        <Section id="github-api" title="GitHub API Usage">
          <p>
            RepoRev uses the GitHub REST API v3. A typical analysis requires{' '}
            <strong className="text-text">2 + N</strong> API calls, where N is the number of files
            selected for content analysis (typically 15-25).
          </p>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-text font-semibold">Call</th>
                  <th className="text-left py-3 px-4 text-text font-semibold">Endpoint</th>
                  <th className="text-left py-3 px-4 text-text font-semibold">Purpose</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                <tr className="border-b border-border">
                  <td className="py-3 px-4">1</td>
                  <td className="py-3 px-4 font-mono text-xs text-neon">GET /repos/:owner/:repo</td>
                  <td className="py-3 px-4">Repo metadata (branch, stars, license, etc.)</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4">2</td>
                  <td className="py-3 px-4 font-mono text-xs text-neon">
                    GET /repos/:owner/:repo/git/trees/:branch?recursive=1
                  </td>
                  <td className="py-3 px-4">Full file tree in one call</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">3-N</td>
                  <td className="py-3 px-4 font-mono text-xs text-neon">
                    GET /repos/:owner/:repo/contents/:path
                  </td>
                  <td className="py-3 px-4">Individual file contents (base64)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4">
            <strong className="text-text">Rate limits:</strong> Without authentication, GitHub
            allows 60 requests per hour. With a personal access token (entered in Settings), this
            increases to 5,000 per hour. RepoRev tracks your remaining quota in the header and warns
            you when running low.
          </p>
        </Section>

        {/* File Selection */}
        <Section id="file-selection" title="File Selection Strategy">
          <p>
            After fetching the full tree (which can contain thousands of entries), RepoRev selects a
            maximum of 25 files to download for content analysis. Files are prioritized in two
            tiers:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-5 rounded-xl bg-surface-alt border border-border">
              <h4 className="text-base font-semibold text-text mb-2">
                High Priority (exact matches)
              </h4>
              <p className="text-sm text-text-secondary mb-3">
                ~55 hardcoded paths that are critical for analysis. These are always fetched if they
                exist.
              </p>
              <div className="text-sm text-text-muted space-y-1">
                <p>README.md, LICENSE, SECURITY.md</p>
                <p>CONTRIBUTING.md, CHANGELOG.md</p>
                <p>package.json, Cargo.toml, go.mod</p>
                <p>.eslintrc.js, tsconfig.json, .prettierrc</p>
                <p>Dockerfile, Makefile, .editorconfig</p>
                <p>.github/dependabot.yml, CODEOWNERS</p>
              </div>
            </div>
            <div className="p-5 rounded-xl bg-surface-alt border border-border">
              <h4 className="text-base font-semibold text-text mb-2">
                Lower Priority (dynamic matches)
              </h4>
              <p className="text-sm text-text-secondary mb-3">
                Pattern-matched files that fill the remaining budget after exact matches.
              </p>
              <div className="text-sm text-text-muted space-y-1">
                <p>Workflow files (.github/workflows/*.yml) — max 5</p>
                <p>Issue templates (.github/ISSUE_TEMPLATE/*) — max 3</p>
                <p>CodeQL configs (any path containing "codeql")</p>
                <p>PR template (.github/PULL_REQUEST_TEMPLATE.md)</p>
              </div>
            </div>
          </div>

          <p className="mt-4">
            This priority system ensures that a repo with 50 workflow files (like large monorepos)
            doesn't crowd out essential files like README.md or package.json. The tree itself (file
            paths and directory structure) is always fully available for analysis — only content
            downloads are capped.
          </p>
        </Section>

        {/* AI Enrichment */}
        <Section id="ai-enrichment" title="AI Enrichment (Optional)">
          <p>
            When enabled in Settings, RepoRev sends a structured summary of the analysis results to
            the Anthropic Messages API. This is the only step that transmits data outside your
            browser.
          </p>
          <p>
            The prompt includes: repo name, description, overall grade, all category scores with
            signal counts, tech stack, and the heuristic-generated strengths and risks. It does{' '}
            <strong className="text-text">not</strong> send any actual file contents or source code.
          </p>
          <p>The AI returns a JSON object with three fields:</p>
          <ul className="list-disc list-inside space-y-1 text-text-secondary ml-2">
            <li>
              <strong className="text-text">Executive summary</strong> — 2-3 sentences on the repo's
              health and maturity
            </li>
            <li>
              <strong className="text-text">Risks</strong> — 3 specific, concrete concerns based on
              the data
            </li>
            <li>
              <strong className="text-text">Recommendations</strong> — 3 actionable steps to improve
              the repository
            </li>
          </ul>
          <p>
            This step requires a BYO (bring your own) Anthropic API key. The key is stored in
            browser memory only and is never persisted to disk or IndexedDB.
          </p>
        </Section>

        {/* Privacy */}
        <Section id="privacy" title="Privacy & Security">
          <p>RepoRev is designed with privacy as a core constraint:</p>
          <ul className="list-disc list-inside space-y-2 text-text-secondary ml-2">
            <li>
              <strong className="text-text">No backend</strong> — There is no server. The app is
              static HTML/JS/CSS served from your origin.
            </li>
            <li>
              <strong className="text-text">Browser-only analysis</strong> — All heuristic analysis
              runs locally in your browser. File contents never leave the tab.
            </li>
            <li>
              <strong className="text-text">Secrets in memory only</strong> — GitHub tokens and
              Anthropic API keys are stored in React state. They are never written to localStorage,
              IndexedDB, cookies, or any persistent storage. They are lost on page refresh.
            </li>
            <li>
              <strong className="text-text">IndexedDB for reports only</strong> — Analysis results
              and settings (theme, LLM mode) are cached locally. No credentials are persisted.
            </li>
            <li>
              <strong className="text-text">Public repos only</strong> — RepoRev only works with
              public GitHub repositories. It cannot access private repos even with a token (the
              token only increases rate limits).
            </li>
            <li>
              <strong className="text-text">AI enrichment is opt-in</strong> — The Anthropic API
              call is the only external data transmission, and it only sends analysis metadata
              (scores and signals), not source code. It requires explicit opt-in and a BYO key.
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
