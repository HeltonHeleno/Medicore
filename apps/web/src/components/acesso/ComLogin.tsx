/**
 * Fase 28 (BL-02.4) — No modo API, o sistema só abre com sessão. Sem sessão, vai para o login e
 * volta depois para a mesma tela. Se a sessão terminar com a tela aberta (E-19), um aviso pede o
 * login ali mesmo: o que estava preenchido continua na tela.
 */
import { ta } from '@medicore/dominio/i18n/pt-BR/acesso';
import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSessao, useSessaoTerminou } from '../../hooks/useSessao';
import { carregarSessao, sair } from '../../services/acesso';
import { Modal } from '../ui/feedback/Modal';
import { CarregandoPagina } from '../ui/CarregandoPagina';
import { FormularioEntrada } from './FormularioEntrada';

/** A primeira consulta da sessão, compartilhada por quem montar antes dela terminar. */
let consulta: Promise<unknown> | null = null;

export default function ComLogin({ children }: { children: ReactNode }) {
  const sessao = useSessao();
  const terminou = useSessaoTerminou();
  const { pathname, search } = useLocation();
  const [conferida, setConferida] = useState(sessao !== null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    if (conferida) return;
    let ativo = true;
    consulta ??= carregarSessao().finally(() => {
      consulta = null;
    });
    consulta.then(
      () => ativo && setConferida(true),
      () => ativo && setFalhou(true),
    );
    return () => {
      ativo = false;
    };
  }, [conferida]);

  // Sem servidor: o layout abre e cada tela mostra "Sem conexão" (E-22) com "Tentar novamente".
  if (!conferida && !falhou) return <CarregandoPagina />;
  if (!falhou && (!sessao || sessao.etapa !== 'ativa')) {
    const volta = `${pathname}${search}`;
    return (
      <Navigate
        to={volta === '/' ? '/entrar' : `/entrar?volta=${encodeURIComponent(volta)}`}
        replace
      />
    );
  }
  return (
    <>
      {children}
      <Modal
        aberto={terminou}
        // Fechar sem entrar de novo é sair (vai para o login).
        aoFechar={() => void sair()}
        papel="alertdialog"
        titulo={ta.sessao.expiradaTitulo}
        descricao={ta.sessao.expiradaDescricao}
      >
        {terminou && <FormularioEntrada aoEntrar={() => {}} emailInicial={sessao?.usuario.email} />}
      </Modal>
    </>
  );
}
