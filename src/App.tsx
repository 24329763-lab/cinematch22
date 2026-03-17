import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import ChatPage from "@/pages/ChatPage";
import HomePage from "@/pages/HomePage";
import ProfilePage from "@/pages/ProfilePage";
import AuthPage from "@/pages/AuthPage";
import WatchlistPage from "@/pages/WatchlistPage";
import WatchedPage from "@/pages/WatchedPage";
import MoviePage from "@/pages/MoviePage";
import PartyPage from "@/pages/PartyPage";
import OnboardingPage from "@/pages/OnboardingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === "/auth";
    const isOnboardingPage = pathname === "/onboarding";

    // If logged in but no onboarding done, send to onboarding
    // We check taste_bio as an indicator if the process was done
    if (user && !isAuthPage && !isOnboardingPage) {
      if (!profile?.taste_bio) {
        navigate("/onboarding");
      }
    }
  }, [user, profile, loading, pathname, navigate]);

  return (
    <div className="dark min-h-dvh bg-background text-foreground">
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/watched" element={<WatchedPage />} />
        <Route path="/movie/:slug" element={<MoviePage />} />
        <Route path="/party/:friendId" element={<PartyPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
