import '@fontsource-variable/inter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Módulos operacionais: retenção diária (A15) e, em desenvolvimento, as invariantes (A17).
// Carregados sob demanda, quando o navegador fica livre, para não pesar na primeira abertura.
const iniciarOperacoes = () =>
  void import('./services/inicializacao-operacoes')
    .then((m) => m.iniciarOperacoes())
    .catch(() => {});
if ('requestIdleCallback' in window) requestIdleCallback(iniciarOperacoes, { timeout: 5000 });
else setTimeout(iniciarOperacoes, 2000);
