import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { LanguageProvider } from './LanguageContext';

// Patch localStorage to emit an event when tf_token is modified
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, _value) {
  originalSetItem.apply(this, arguments);
  if (key === 'tf_token') window.dispatchEvent(new Event('authChanged'));
};

const originalRemoveItem = localStorage.removeItem;
localStorage.removeItem = function(key) {
  originalRemoveItem.apply(this, arguments);
  if (key === 'tf_token') window.dispatchEvent(new Event('authChanged'));
};
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
