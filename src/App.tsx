import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";

import { Toaster } from "@/components/global/notifications/index.ts";
import { PageLoader } from "@/components/global";
import { createQueryClient } from "@/lib/queryConfig";
import { RouteTransition } from "@/components/layout/RouteTransition";
import { ProtectedRoute } from "@/components/auth";

import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";

const AuthCallback = lazy(() => import("./pages/AuthCallback"));

const NotFoundPage = lazy(() =>
  import("./components/error").then((module) => ({
    default: module.NotFoundPage,
  }))
);

const EventLogs = lazy(() =>
  import("./pages/EventLogs.tsx").then((module) => ({
    default: module.EventLogs,
  }))
);

const ToastTest = lazy(() => import("./pages/ToastTest"));

const DebugTrace = lazy(() => import("./pages/DebugTrace.tsx"));
const TraceTransaction = lazy(() => import("./pages/TraceTransaction.tsx"));
const BlockTraceAnalyzer = lazy(() => import("@/pages/BlockTraceAnalyzer.tsx"));
const DebugBlockTrace = lazy(() => import("./pages/DebugBlockTrace"));
const ReplayTransactions = lazy(() => import("./pages/ReplayTransactions"));
const BytecodeAnalysis = lazy(() => import("./pages/BytecodeAnalysis"));
const StorageAnalysis = lazy(() => import("./pages/StorageAnalysis"));
const TransactionSimulation = lazy(
  () => import("./pages/TransactionSimulation")
);
const NetworkMonitor = lazy(() => import("./pages/NetworkMonitor"));

const ComparativeTransactionAnalysis = lazy(() =>
  import("./pages/ComparativeTransactionAnalysis").then((module) => ({
    default: module.ComparativeTransactionAnalysis,
  }))
);

const AnalysisHistoryPage = lazy(() =>
  import("./pages/AnalysisHistoryPage").then((module) => ({
    default: module.AnalysisHistoryPage,
  }))
);

const PerformanceDashboardPage = lazy(() =>
  import("./pages/PerformanceDashboardPage").then((module) => ({
    default: module.PerformanceDashboardPage,
  }))
);

const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));

const RouteLoader = () => <PageLoader />;

const queryClient = createQueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <RouteTransition>
              <Landing />
            </RouteTransition>
          }
        />

        <Route
          path="/debug-trace"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <RouteTransition>
                  <DebugTrace />
                </RouteTransition>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/debug-trace/:txHash"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <RouteTransition>
                  <DebugTrace />
                </RouteTransition>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trace-transaction"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <RouteTransition>
                  <TraceTransaction />
                </RouteTransition>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trace-transaction/:txHash"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <RouteTransition>
                  <TraceTransaction />
                </RouteTransition>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/comparative-analysis"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <RouteTransition>
                  <ComparativeTransactionAnalysis />
                </RouteTransition>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analysis-history"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <RouteTransition>
                  <AnalysisHistoryPage />
                </RouteTransition>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/performance-dashboard"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <RouteTransition>
                  <PerformanceDashboardPage />
                </RouteTransition>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transaction-simulation"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <RouteTransition>
                  <TransactionSimulation />
                </RouteTransition>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/trace-block"
          element={
            <Suspense fallback={<RouteLoader />}>
              <BlockTraceAnalyzer />
            </Suspense>
          }
        />
        <Route
          path="/trace-block/:blockId"
          element={
            <Suspense fallback={<RouteLoader />}>
              <BlockTraceAnalyzer />
            </Suspense>
          }
        />
        <Route
          path="/debug-block-trace"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <RouteTransition>
                  <DebugBlockTrace />
                </RouteTransition>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/debug-block-trace/:blockId"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <RouteTransition>
                  <DebugBlockTrace />
                </RouteTransition>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/replay-transactions"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <RouteTransition>
                  <ReplayTransactions />
                </RouteTransition>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/replay-transactions/:txHash"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <RouteTransition>
                  <ReplayTransactions />
                </RouteTransition>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/state-simulator"
          element={
            <Suspense fallback={<RouteLoader />}>
              <RouteTransition>
                <DebugTrace />
              </RouteTransition>
            </Suspense>
          }
        />
        <Route
          path="/network-monitor"
          element={
            <Suspense fallback={<RouteLoader />}>
              <RouteTransition>
                <NetworkMonitor />
              </RouteTransition>
            </Suspense>
          }
        />
        <Route
          path="/block-explorer"
          element={
            <Suspense fallback={<RouteLoader />}>
              <RouteTransition>
                <DebugTrace />
              </RouteTransition>
            </Suspense>
          }
        />

        <Route
          path="/event-logs"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <RouteTransition>
                  <EventLogs />
                </RouteTransition>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/event-logs/:blockRange"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <RouteTransition>
                  <EventLogs />
                </RouteTransition>
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/bytecode-analysis"
          element={
            <Suspense fallback={<RouteLoader />}>
              <RouteTransition>
                <BytecodeAnalysis />
              </RouteTransition>
            </Suspense>
          }
        />
        <Route
          path="/storage-analysis"
          element={
            <Suspense fallback={<RouteLoader />}>
              <RouteTransition>
                <StorageAnalysis />
              </RouteTransition>
            </Suspense>
          }
        />
        <Route
          path="/storage-analysis/:contractAddress"
          element={
            <Suspense fallback={<RouteLoader />}>
              <RouteTransition>
                <StorageAnalysis />
              </RouteTransition>
            </Suspense>
          }
        />
        <Route
          path="/log-scanner"
          element={
            <Suspense fallback={<RouteLoader />}>
              <RouteTransition>
                <DebugTrace />
              </RouteTransition>
            </Suspense>
          }
        />
        <Route
          path="/toast"
          element={
            <Suspense fallback={<RouteLoader />}>
              <RouteTransition>
                <ToastTest />
              </RouteTransition>
            </Suspense>
          }
        />
        <Route path="/auth" element={<Navigate to="/signin" replace />} />
        <Route path="/login" element={<Navigate to="/signin" replace />} />
        <Route
          path="/signin"
          element={
            <RouteTransition>
              <SignIn />
            </RouteTransition>
          }
        />
        <Route
          path="/signup"
          element={
            <RouteTransition>
              <SignUp />
            </RouteTransition>
          }
        />

        <Route
          path="/auth/callback"
          element={
            <Suspense fallback={<RouteLoader />}>
              <RouteTransition>
                <AuthCallback />
              </RouteTransition>
            </Suspense>
          }
        />
        <Route
          path="/privacy-policy"
          element={
            <Suspense fallback={<RouteLoader />}>
              <RouteTransition>
                <PrivacyPolicy />
              </RouteTransition>
            </Suspense>
          }
        />
        <Route
          path="/terms-of-service"
          element={
            <Suspense fallback={<RouteLoader />}>
              <RouteTransition>
                <TermsOfService />
              </RouteTransition>
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<RouteLoader />}>
              <RouteTransition>
                <NotFoundPage />
              </RouteTransition>
            </Suspense>
          }
        />
      </Routes>
      <Toaster />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
