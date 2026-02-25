import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { msalInstance } from './auth/msal';
import { getActiveAccount } from './auth/authService';

async function StartApp() {
  //initialize first
  await msalInstance.initialize();

  //handles redirect response after loginRedirect
  const response = await msalInstance.handleRedirectPromise();

  // If redirect returned an account, set it active
  if (response?.account) {
    msalInstance.setActiveAccount(response.account);
  }

  // If not, but cache has accounts, set one active
  getActiveAccount();

  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
StartApp().catch(console.error);
