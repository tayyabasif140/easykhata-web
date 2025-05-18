
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from 'next-themes'

// Explicitly set the React variable in the window to ensure all components use the same instance
window.React = React;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem 
      disableTransitionOnChange
      storageKey="ezkhata-theme-preference"
    >
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
