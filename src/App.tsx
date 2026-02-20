import { useState, lazy, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AnalysisProvider } from './context/AnalysisContext';
import { Layout } from './components/layout/Layout';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { LoadingScreen } from './components/common/LoadingScreen';
import { HomePage } from './pages/HomePage';
import type { PageId } from './types';

// Lazy-load heavier pages for code splitting
const HowItWorksPage = lazy(() =>
  import('./pages/HowItWorksPage').then((m) => ({ default: m.HowItWorksPage })),
);
const OrgScanPage = lazy(() =>
  import('./pages/OrgScanPage').then((m) => ({ default: m.OrgScanPage })),
);
const ComparePage = lazy(() =>
  import('./pages/ComparePage').then((m) => ({ default: m.ComparePage })),
);
const PortfolioPage = lazy(() =>
  import('./pages/PortfolioPage').then((m) => ({ default: m.PortfolioPage })),
);
const DiscoverPage = lazy(() =>
  import('./pages/DiscoverPage').then((m) => ({ default: m.DiscoverPage })),
);
const PolicyPage = lazy(() =>
  import('./pages/PolicyPage').then((m) => ({ default: m.PolicyPage })),
);
const GitStatsPage = lazy(() =>
  import('./pages/GitStatsPage').then((m) => ({ default: m.GitStatsPage })),
);
const TechDetectPage = lazy(() =>
  import('./pages/TechDetectPage').then((m) => ({ default: m.TechDetectPage })),
);

function AppContent() {
  const [page, setPage] = useState<PageId>('home');
  const { state: appState } = useApp();
  const token = appState.githubToken || '';

  return (
    <Layout onNavigate={setPage} currentPage={page}>
      <Suspense fallback={<LoadingScreen />}>
        {page === 'home' && <HomePage onNavigate={setPage} />}
        {page === 'docs' && <HowItWorksPage onBack={() => setPage('home')} />}
        {page === 'org-scan' && (
          <OrgScanPage
            onBack={() => setPage('home')}
            onAnalyze={() => setPage('home')}
            githubToken={token}
          />
        )}
        {page === 'compare' && <ComparePage onBack={() => setPage('home')} githubToken={token} />}
        {page === 'portfolio' && (
          <PortfolioPage
            onBack={() => setPage('home')}
            onAnalyze={() => setPage('home')}
            githubToken={token}
          />
        )}
        {page === 'discover' && <DiscoverPage onNavigate={setPage as (page: string) => void} />}
        {page === 'policy' && <PolicyPage onNavigate={setPage as (page: string) => void} />}
        {page === 'git-stats' && <GitStatsPage onBack={() => setPage('home')} />}
        {page === 'tech-detect' && <TechDetectPage onBack={() => setPage('home')} />}
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AnalysisProvider>
        <AppContent />
        <SettingsPanel />
      </AnalysisProvider>
    </AppProvider>
  );
}
