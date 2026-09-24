import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GoogleTranslateProvider } from './components/common/GoogleTranslate';
import { LanguageProvider } from './context/LanguageContext';
import RoleProtectedRoute from './components/common/RoleProtectedRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import DiseaseDetectionPage from './pages/DiseaseDetectionPage';
import IrrigationPage from './pages/IrrigationPage';
import SustainabilityPage from './pages/SustainabilityPage';
import AssistantPage from './pages/AssistantPage';
import CropRecommendationPage from './pages/CropRecommendationPage';
import WeatherPage from './pages/WeatherPage';
import PestTrapPage from './pages/PestTrapPage';
import HotspotMapPage from './pages/HotspotMapPage';
import ExpertReviewPage from './pages/ExpertReviewPage';
import FollowUpPage from './pages/FollowUpPage';
import FeedbackDatasetPage from './pages/FeedbackDatasetPage';
import RegionalMonitoringPage from './pages/RegionalMonitoringPage';

// Protected route: redirect to login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public-only route: redirect authenticated users to dashboard
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

export function App() {
  return (
    <BrowserRouter>
      <GoogleTranslateProvider>
        <LanguageProvider>
          <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />

            {/* Dashboard — all authenticated users */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/weather" element={<ProtectedRoute><WeatherPage /></ProtectedRoute>} />

            {/* Farmer-only routes */}
            <Route path="/disease" element={
              <RoleProtectedRoute allow={['farmer']}>
                <DiseaseDetectionPage />
              </RoleProtectedRoute>
            } />
            <Route path="/pests" element={
              <RoleProtectedRoute allow={['farmer']}>
                <PestTrapPage />
              </RoleProtectedRoute>
            } />
            <Route path="/followups" element={
              <RoleProtectedRoute allow={['farmer']}>
                <FollowUpPage />
              </RoleProtectedRoute>
            } />
            <Route path="/irrigation" element={
              <RoleProtectedRoute allow={['farmer']}>
                <IrrigationPage />
              </RoleProtectedRoute>
            } />
            <Route path="/crop" element={
              <RoleProtectedRoute allow={['farmer']}>
                <CropRecommendationPage />
              </RoleProtectedRoute>
            } />
            <Route path="/crop-recommendation" element={
              <RoleProtectedRoute allow={['farmer']}>
                <CropRecommendationPage />
              </RoleProtectedRoute>
            } />
            <Route path="/sustainability" element={
              <RoleProtectedRoute allow={['farmer']}>
                <SustainabilityPage />
              </RoleProtectedRoute>
            } />
            <Route path="/assistant" element={
              <RoleProtectedRoute allow={['farmer']}>
                <AssistantPage />
              </RoleProtectedRoute>
            } />

            {/* All roles can see hotspots (component handles role-based API scoping) */}
            <Route path="/hotspots" element={<ProtectedRoute><HotspotMapPage /></ProtectedRoute>} />

            {/* Expert / Officer only */}
            <Route path="/expert" element={
              <RoleProtectedRoute allow={['expert', 'officer']}>
                <ExpertReviewPage />
              </RoleProtectedRoute>
            } />

            {/* Officer only */}
            <Route path="/feedback" element={
              <RoleProtectedRoute allow={['officer']}>
                <FeedbackDatasetPage />
              </RoleProtectedRoute>
            } />
            <Route path="/regional-monitoring" element={
              <RoleProtectedRoute allow={['officer']}>
                <RegionalMonitoringPage />
              </RoleProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </GoogleTranslateProvider>
  </BrowserRouter>
  );
}

export default App;
