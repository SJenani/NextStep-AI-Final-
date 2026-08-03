import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import BookmarkTrackerPage from "./pages/BookmarkTrackerPage";
import ChatbotPage from "./pages/ChatbotPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import ApplyJob from "./pages/ApplyJob";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import RecommendationsPage from "./pages/RecommendationsPage";
import ResumeUploadPage from "./pages/ResumeUploadPage";
import RoadmapPage from "./pages/RoadmapPage";
import SignupPage from "./pages/SignupPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";

function AppShellRoutes() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export default function App() {
  return (
    <>
      <Toaster position="bottom-right" />
      <Routes>
        <Route path="/" element={<HomePage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/settings" element={<AdminSettingsPage />} />
      <Route
        path="/chatbot"
        element={
          <ProtectedRoute>
            <ChatbotPage />
          </ProtectedRoute>
        }
      />
      <Route element={<AppShellRoutes />}>
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resume"
          element={
            <ProtectedRoute>
              <ResumeUploadPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/apply/:jobId"
          element={
            <ProtectedRoute>
              <ApplyJob />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/skill-gap"
          element={
            <ProtectedRoute>
              <DashboardPage view="skill-gap" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recommendations"
          element={
            <ProtectedRoute>
              <RecommendationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmap"
          element={
            <ProtectedRoute>
              <RoadmapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bookmarks"
          element={
            <ProtectedRoute>
              <BookmarkTrackerPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    </>
  );
}
