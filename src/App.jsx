import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/Themes+Styles.jsx';
import SupabaseAuthProvider from './components/Auth/SupabaseAuthProvider.jsx';
import AstraApp from './components/AstraApp.jsx';
import ArticlePage from './routes/ArticlePage.jsx';
import './App.css';

export const AppRoutes = () => (
  <Routes>
    <Route path="/articles/:slug" element={<ArticlePage />} />
    <Route path="/article/:slug" element={<ArticlePage />} />
    <Route path="/*" element={<AstraApp />} />
  </Routes>
);

export const AppProviders = ({ children }) => (
  <SupabaseAuthProvider>
    <ThemeProvider>{children}</ThemeProvider>
  </SupabaseAuthProvider>
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
