import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/Themes+Styles.jsx';
import SupabaseAuthProvider from './components/Auth/SupabaseAuthProvider.jsx';
import AstraApp from './components/AstraApp.jsx';
import ArticlePage from './routes/ArticlePage.jsx';
import AboutPage from './routes/AboutPage.jsx';
import QBankPage from './routes/QBankPage.jsx';
import ReferralAdminPage from './routes/ReferralAdminPage.jsx';
import './App.css';

export const AppRoutes = () => (
  <Routes>
    <Route path="/articles/:slug" element={<ArticlePage />} />
    <Route path="/article/:slug" element={<ArticlePage />} />
    <Route path="/about" element={<AboutPage />} />
    <Route path="/qbank" element={<QBankPage />} />
    <Route path="/admin/referrals" element={<ReferralAdminPage />} />
    <Route path="/*" element={<AstraApp />} />
  </Routes>
);

export const AppProviders = ({ children }) => (
  <ThemeProvider>
    <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
  </ThemeProvider>
);

function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}

export default App;
