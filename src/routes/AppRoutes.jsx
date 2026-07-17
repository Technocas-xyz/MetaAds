import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import PageSkeleton from '../components/ui/PageSkeleton'
import useAuthStore from '../store/useAuthStore'

// ── Lazy feature pages ────────────────────────────────────────────────────────
const Dashboard             = lazy(() => import('../features/dashboard/DashboardPage'))
const Competitors           = lazy(() => import('../features/competitors/CompetitorsPage'))
const Ads                   = lazy(() => import('../features/ads-library/AdsLibraryPage'))
const AddNewAd              = lazy(() => import('../features/ads-library/AddNewAdPage'))
const AdDetail              = lazy(() => import('../features/ad-detail/AdDetailPage'))
const AIAnalysis            = lazy(() => import('../features/ai-analysis/AIAnalysisPage'))
const CompetitorAnalysis    = lazy(() => import('../features/ai-analysis/CompetitorAnalysisPage'))
const MyAds                 = lazy(() => import('../features/my-ads/MyAdsPage'))
const RemovedAds            = lazy(() => import('../features/removed-ads/RemovedAdsPage'))
const AIRecommend           = lazy(() => import('../features/ai-recommend/AIRecommendPage'))
const Hooks                 = lazy(() => import('../features/hooks/HooksPage'))
const Angles                = lazy(() => import('../features/angles/AnglesPage'))
const Offers                = lazy(() => import('../features/offers/OffersPage'))
const Recommendations       = lazy(() => import('../features/recommendations/RecommendationsPage'))
const CreativeReview        = lazy(() => import('../features/creative-review/CreativeReviewPage'))
const Performance           = lazy(() => import('../features/performance/PerformancePage'))
const CreativeDetail        = lazy(() => import('../features/creative-performance/CreativePerformanceDetailPage'))
const Briefs                = lazy(() => import('../features/briefs/BriefsPage'))
const BriefGenerator        = lazy(() => import('../features/creative-briefs/BriefGeneratorPage'))
const BriefDetail           = lazy(() => import('../features/creative-briefs/BriefDetailPage'))
const Campaigns             = lazy(() => import('../features/campaigns/CampaignsPage'))
const CampaignWizard        = lazy(() => import('../features/campaigns/CampaignWizardPage'))
const ScraperCompetitors    = lazy(() => import('../features/scraper/ScraperCompetitorsPage'))
const ScraperCompetitorDetail = lazy(() => import('../features/scraper/ScraperCompetitorDetailPage'))
const LearningLoop          = lazy(() => import('../features/learning-loop/LearningLoopPage'))
const InsightLog            = lazy(() => import('../features/insight-log/InsightLogPage'))
const PredictionAccuracy    = lazy(() => import('../features/prediction-accuracy/PredictionAccuracyPage'))
const Review                = lazy(() => import('../features/review/ReviewPage'))
const ManualReview          = lazy(() => import('../features/manual-review/ManualReviewPage'))
const LowConfidence         = lazy(() => import('../features/low-confidence/LowConfidencePage'))
const Settings              = lazy(() => import('../features/settings/SettingsPage'))
const Users                 = lazy(() => import('../features/users/UsersPage'))
const ActivityLogs          = lazy(() => import('../features/activity-logs/ActivityLogsPage'))
const LoginPage             = lazy(() => import('../pages/Login'))

// ── Not Found ─────────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <span className="text-6xl font-bold text-gray-200">404</span>
      <p className="text-lg text-text-secondary">Page not found</p>
      <a href="/dashboard" className="text-sm text-primary-600 hover:underline">
        Back to Dashboard
      </a>
    </div>
  )
}

// ── Protected shell layout ────────────────────────────────────────────────────
function ProtectedLayout() {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return (
    <AppShell>
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </AppShell>
  )
}

// ── Routes ────────────────────────────────────────────────────────────────────
export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <LoginPage />
          </Suspense>
        }
      />

      {/* Protected — wrapped in AppShell */}
      <Route element={<ProtectedLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Intelligence */}
        <Route path="/competitors/:id" element={<ScraperCompetitorDetail />} />
        <Route path="/competitors"    element={<Competitors />} />
        <Route path="/ads/new"        element={<AddNewAd />} />
        <Route path="/ads/:id"        element={<AdDetail />} />
        <Route path="/ads"            element={<Ads />} />
        <Route path="/ai-analysis/competitors/:id" element={<CompetitorAnalysis />} />
        <Route path="/ai-analysis"    element={<AIAnalysis />} />
        <Route path="/my-ads"         element={<MyAds />} />
        <Route path="/removed-ads"   element={<RemovedAds />} />
        <Route path="/ai-recommendation" element={<AIRecommend />} />
        <Route path="/hooks"          element={<Hooks />} />
        <Route path="/angles"         element={<Angles />} />
        <Route path="/offers"         element={<Offers />} />

        {/* Workflows */}
        <Route path="/recommendations"  element={<Recommendations />} />
        <Route path="/creative-review"  element={<CreativeReview />} />
        <Route path="/performance/creative/:id" element={<CreativeDetail />} />
        <Route path="/performance"      element={<Performance />} />
        <Route path="/briefs/new"        element={<BriefGenerator />} />
        <Route path="/briefs/:id"        element={<BriefDetail />} />
        <Route path="/briefs"            element={<Briefs />} />
        <Route path="/campaigns/new"     element={<CampaignWizard />} />
        <Route path="/campaigns"        element={<Campaigns />} />

        {/* Scraper */}
        <Route path="/scraper/competitors/:id" element={<ScraperCompetitorDetail />} />
        <Route path="/scraper/competitors"     element={<ScraperCompetitors />} />

        {/* Learning & Optimization */}
        <Route path="/learning-loop"       element={<LearningLoop />} />
        <Route path="/insight-log"         element={<InsightLog />} />
        <Route path="/prediction-accuracy" element={<PredictionAccuracy />} />

        {/* Review & QA */}
        <Route path="/review/:id"      element={<ManualReview />} />
        <Route path="/review"          element={<Review />} />
        <Route path="/low-confidence"  element={<LowConfidence />} />

        {/* System */}
        <Route path="/settings"       element={<Settings />} />
        <Route path="/users"          element={<Users />} />
        <Route path="/activity-logs"  element={<ActivityLogs />} />

        {/* Legacy aliases */}
        <Route path="/ads-library"                   element={<Navigate to="/ads" replace />} />
        <Route path="/hook-library"                  element={<Navigate to="/hooks" replace />} />
        <Route path="/angle-library"                 element={<Navigate to="/angles" replace />} />
        <Route path="/offer-library"                 element={<Navigate to="/offers" replace />} />
        <Route path="/ai-creative-recommendations"   element={<Navigate to="/recommendations" replace />} />
        <Route path="/creative-review-qa"            element={<Navigate to="/creative-review" replace />} />
        <Route path="/performance-intelligence"      element={<Navigate to="/performance" replace />} />
        <Route path="/creative-briefs"               element={<Navigate to="/briefs" replace />} />
        <Route path="/review-queue"                  element={<Navigate to="/review" replace />} />

        {/* 404 within shell */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
