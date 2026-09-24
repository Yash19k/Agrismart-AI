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
import FarmPage from './pages/FarmPage';
import RiskForecastPage from './pages/RiskForecastPage';
import ReferralPage from './pages/ReferralPage';

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

            {/* Dashboard & Weather — all authenticated users */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/weather" element={<ProtectedRoute><WeatherPage /></ProtectedRoute>} />

            {/* Canonical Workflow Stage 0: Farm Context */}
            <Route path="/farm" element={
              <RoleProtectedRoute allow={['farmer']}>
                <FarmPage />
              </RoleProtectedRoute>
            } />
            <Route path="/myfarm" element={<Navigate to="/farm" replace />} />

            {/* Canonical Workflow Stage 1a: Disease Detection */}
            <Route path="/disease" element={
              <RoleProtectedRoute allow={['farmer']}>
                <DiseaseDetectionPage />
              </RoleProtectedRoute>
            } />

            {/* Canonical Workflow Stage 1b: Pest & Sensor */}
            <Route path="/pests" element={
              <RoleProtectedRoute allow={['farmer']}>
                <PestTrapPage />
              </RoleProtectedRoute>
            } />

            {/* Canonical Workflow Stage 2: Risk Forecast */}
            <Route path="/risk" element={
              <RoleProtectedRoute allow={['farmer']}>
                <RiskForecastPage />
              </RoleProtectedRoute>
            } />

            {/* Canonical Workflow Stage 6: Referrals */}
            <Route path="/referrals" element={
              <RoleProtectedRoute allow={['farmer', 'expert', 'officer']}>
                <ReferralPage />
              </RoleProtectedRoute>
            } />

            {/* Canonical Workflow Stage 7: Follow-ups */}
            <Route path="/followups" element={
              <RoleProtectedRoute allow={['farmer']}>
                <FollowUpPage />
              </RoleProtectedRoute>
            } />

            {/* Secondary Tools: Irrigation, Crop Recommendation, Sustainability, Assistant */}
            <Route path="/irrigation" element={
              <RoleProtectedRoute allow={['farmer']}>
                <IrrigationPage />
              </RoleProtectedRoute>
            } />
            <Route path="/crop" element={<Navigate to="/crop-recommendation" replace />} />
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

            {/* Canonical Workflow Stage 9: Hotspots & Surveillance */}
            <Route path="/hotspots" element={<ProtectedRoute><HotspotMapPage /></ProtectedRoute>} />

            {/* Canonical Workflow Stage 5: Expert Review Queue */}
            <Route path="/expert" element={
              <RoleProtectedRoute allow={['expert', 'officer']}>
                <ExpertReviewPage />
              </RoleProtectedRoute>
            } />

            {/* Canonical Workflow Stage 8: Feedback Dataset */}
            <Route path="/feedback" element={
              <RoleProtectedRoute allow={['officer']}>
                <FeedbackDatasetPage />
              </RoleProtectedRoute>
            } />

            {/* Canonical Workflow Stage 9: Regional Monitoring */}
            <Route path="/regional-monitoring" element={
              <RoleProtectedRoute allow={['officer']}>
                <RegionalMonitoringPage />
              </RoleProtectedRoute>
            } />
            <Route path="/regional" element={<Navigate to="/regional-monitoring" replace />} />

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
