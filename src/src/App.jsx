import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GoogleTranslateProvider } from './components/common/GoogleTranslate';
import { LanguageProvider } from './context/LanguageContext';

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

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/weather" element={<ProtectedRoute><WeatherPage /></ProtectedRoute>} />
            <Route path="/disease" element={<ProtectedRoute><DiseaseDetectionPage /></ProtectedRoute>} />
            <Route path="/crop" element={<ProtectedRoute><CropRecommendationPage /></ProtectedRoute>} />
            <Route path="/crop-recommendation" element={<ProtectedRoute><CropRecommendationPage /></ProtectedRoute>} />
            <Route path="/irrigation" element={<ProtectedRoute><IrrigationPage /></ProtectedRoute>} />
            <Route path="/assistant" element={<ProtectedRoute><AssistantPage /></ProtectedRoute>} />
            <Route path="/sustainability" element={<ProtectedRoute><SustainabilityPage /></ProtectedRoute>} />

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
