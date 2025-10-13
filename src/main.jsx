import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App, { AppProviders, AppRoutes } from './App.jsx'
import { BrowserRouter } from 'react-router-dom'

const container = document.getElementById('root')

const appTree = (
  <StrictMode>
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  </StrictMode>
)

if (container.hasChildNodes()) {
  hydrateRoot(container, appTree)
} else {
  createRoot(container).render(appTree)
}
