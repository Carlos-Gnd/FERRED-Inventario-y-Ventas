import { createRoot } from 'react-dom/client';
import App from './app/App';
import { AuthProvider } from './app/context/AuthContext';
import { EcommerceProvider } from './app/context/EcommerceContext';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <EcommerceProvider>
      <App />
    </EcommerceProvider>
  </AuthProvider>,
);
