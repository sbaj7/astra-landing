import React from 'react';
import { ThemeProvider } from './components/Themes+Styles.jsx';
import SupabaseAuthProvider from './components/Auth/SupabaseAuthProvider.jsx';
import AstraApp from './components/AstraApp.jsx';
import './App.css';

function App() {
  return (
    <SupabaseAuthProvider>
      <ThemeProvider>
        <AstraApp />
      </ThemeProvider>
    </SupabaseAuthProvider>
  );
}

export default App;
