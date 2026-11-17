/** Fase 28 (BL-02.1) — Tela de login (só no modo API). */
import { ta } from '@medicore/dominio/i18n/pt-BR/acesso';
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { FormularioEntrada } from '../../components/acesso/FormularioEntrada';
import { LayoutAcesso } from '../../components/acesso/LayoutAcesso';
import { useSessao } from '../../hooks/useSessao';
import { destinoSeguro } from './rotas';

export default function Entrar() {
  const [busca] = useSearchParams();
  const navigate = useNavigate();
  const sessao = useSessao();
  // Só quem chega já com sessão vai direto. Durante o login, quem decide é o formulário (depois
  // do MFA ainda vêm os códigos de recuperação).
  const [jaEntrou] = useState(sessao?.etapa === 'ativa');
  const destino = destinoSeguro(busca.get('volta'));
  if (jaEntrou) return <Navigate to={destino} replace />;
  return (
    <LayoutAcesso titulo={ta.login.titulo} descricao={ta.login.descricao}>
      <FormularioEntrada aoEntrar={() => navigate(destino, { replace: true })} />
    </LayoutAcesso>
  );
}
