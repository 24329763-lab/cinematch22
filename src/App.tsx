import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Index from "./pages/Index";
import ChatPage from "./pages/ChatPage";
import WatchlistPage from "./pages/WatchlistPage";
import ProfilePage from "./pages/ProfilePage";
import OnboardingPage from "./pages/OnboardingPage";
import AuthPage from "./pages/AuthPage";
import MoviePage from "./pages/MoviePage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  return <>{children}</>;
};

const OnboardingCheck = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const skipped = sessionStorage.getItem("onboarding_skipped") === "true";

  if (loading) return null;

  // Only redirect to onboarding if the user hasn't skipped it yet
  if (!skipped) {
    // If logged in but no taste profile
    if (user && profile && !profile.taste_bio) {
      return <Navigate to="/onboarding" />;
    }
    // If not logged in at all
    if (!user) {
      return <Navigate to="/onboarding" />;
    }
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/movie/:slug" element={<MoviePage />} />

          {/* Main Home Route with Onboarding Check */}
          <Route
            path="/"
            element={
              <OnboardingCheck>
                <Index />
              </OnboardingCheck>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/watchlist"
            element={
              <ProtectedRoute>
                <WatchlistPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
