import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/Themes+Styles.jsx';
import SupabaseAuthProvider from './components/Auth/SupabaseAuthProvider.jsx';
import AstraApp from './components/AstraApp.jsx';
import ArticlePage from './routes/ArticlePage.jsx';
import LandingOverlay from './components/LandingOverlay.jsx';
import './App.css';

export const AppRoutes = () => (
  <Routes>
    <Route path="/articles/:slug" element={<ArticlePage />} />
    <Route path="/article/:slug" element={<ArticlePage />} />
    <Route path="/*" element={<AstraApp />} />
  </Routes>
);

export const AppProviders = ({ children }) => (
  <ThemeProvider>
    <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
  </ThemeProvider>
);

function App() {
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the landing page
    const hasSeenLanding = localStorage.getItem('astra_has_seen_landing');

    // Show landing if user hasn't seen it before
    if (!hasSeenLanding) {
      setShowLanding(true);
    }
  }, []);

  const handleCloseLanding = () => {
    setShowLanding(false);
    // Mark that user has seen the landing page
    localStorage.setItem('astra_has_seen_landing', 'true');
  };

  return (
    <AppProviders>
      <BrowserRouter>
        {showLanding && <LandingOverlay onClose={handleCloseLanding} />}
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
