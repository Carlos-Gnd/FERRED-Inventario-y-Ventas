import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import { EcommerceProvider } from './app/context/EcommerceContext';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <EcommerceProvider>
    <App />
  </EcommerceProvider>,
);
