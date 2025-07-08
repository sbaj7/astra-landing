import React from 'react';
import { ThemeProvider } from './components/Themes+Styles.jsx';
import AstraApp from './components/AstraApp.jsx';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AstraApp />
    </ThemeProvider>
  );
}

export default App;