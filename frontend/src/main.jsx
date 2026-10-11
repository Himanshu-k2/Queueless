import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { NetworkProvider } from './context/NetworkContext'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => console.log('SW registered:', registration.scope),
      (err) => console.log('SW registration failed:', err)
    );
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <NetworkProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </NetworkProvider>
    </AuthProvider>
  </React.StrictMode>,
)
