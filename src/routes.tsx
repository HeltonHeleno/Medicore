import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { itensNavegacao } from './config/navegacao';
import { t } from './i18n/pt-BR';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import Placeholder from './pages/Placeholder';

/** Rotas da aplicação (separadas do Router para facilitar os testes). */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        {itensNavegacao
          .filter((item) => item.caminho !== '/')
          .map((item) => (
            <Route
              key={item.caminho}
              path={item.caminho.slice(1)}
              element={<Placeholder titulo={item.rotulo} />}
            />
          ))}
        <Route path="perfil" element={<Placeholder titulo={t.userMenu.meuPerfil} />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
