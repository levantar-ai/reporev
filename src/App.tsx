import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AnalysisProvider } from './context/AnalysisContext';
import { Layout } from './components/layout/Layout';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { LoadingScreen } from './components/common/LoadingScreen';
import { HomePage } from './pages/HomePage';
import { trackPageView } from './utils/analytics';
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
  const [pendingRepo, setPendingRepo] = useState<string | null>(null);
  const { state: appState } = useApp();
  const token = appState.githubToken || '';

  const handleNavigate = useCallback((targetPage: PageId) => {
    setPendingRepo(null);
    setPage(targetPage);
  }, []);

  const handleNavigateWithRepo = useCallback((targetPage: PageId, repo: string) => {
    setPendingRepo(repo);
    setPage(targetPage);
  }, []);

  useEffect(() => {
    trackPageView(page);
  }, [page]);

  return (
    <Layout onNavigate={handleNavigate} currentPage={page}>
      <Suspense fallback={<LoadingScreen />}>
        {page === 'home' && <HomePage onNavigate={handleNavigate} initialRepo={pendingRepo} />}
        {page === 'docs' && <HowItWorksPage onBack={() => handleNavigate('home')} />}
        {page === 'org-scan' && (
          <OrgScanPage
            onBack={() => handleNavigate('home')}
            onAnalyze={() => handleNavigate('home')}
            githubToken={token}
          />
        )}
        {page === 'compare' && (
          <ComparePage onBack={() => handleNavigate('home')} githubToken={token} />
        )}
        {page === 'portfolio' && (
          <PortfolioPage
            onBack={() => handleNavigate('home')}
            onAnalyze={() => handleNavigate('home')}
            githubToken={token}
          />
        )}
        {page === 'discover' && (
          <DiscoverPage
            onNavigate={handleNavigate as (page: string) => void}
            onSendToTool={handleNavigateWithRepo}
          />
        )}
        {page === 'policy' && <PolicyPage onNavigate={handleNavigate as (page: string) => void} />}
        {page === 'git-stats' && (
          <GitStatsPage onBack={() => handleNavigate('home')} initialRepo={pendingRepo} />
        )}
        {page === 'tech-detect' && (
          <TechDetectPage onBack={() => handleNavigate('home')} initialRepo={pendingRepo} />
        )}
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
