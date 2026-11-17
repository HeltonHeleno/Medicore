/**
 * Configurações. Fase 28: no modo API, o Administrador cuida dos usuários aqui (BL-02.5). Fase 29:
 * a auditoria (Administrador e Gestão), na aba "Auditoria". As outras configurações chegam com o
 * BL-50.
 */
import { t } from '@medicore/dominio/i18n/pt-BR';
import { tau } from '@medicore/dominio/i18n/pt-BR/auditoria';
import { useSearchParams } from 'react-router-dom';
import { AbasModulo } from '../components/ui/AbasModulo';
import { usePode } from '../hooks/useSessao';
import { COM_LOGIN } from '../services/acesso';
import Placeholder from './Placeholder';
import Auditoria from './acesso/Auditoria';
import Usuarios from './acesso/Usuarios';

export default function Configuracoes() {
  const podeFazer = usePode();
  const [busca] = useSearchParams();
  const usuarios = COM_LOGIN && podeFazer('usuarios.administrar');
  const auditoria = COM_LOGIN && podeFazer('auditoria.ver');
  if (!usuarios && !auditoria) return <Placeholder titulo={t.menu.configuracoes} />;
  const naAuditoria = auditoria && (!usuarios || busca.get('aba') === 'auditoria');
  const abas = [
    ...(usuarios ? [{ rotulo: tau.abas.usuarios, para: '/configuracoes' }] : []),
    ...(auditoria ? [{ rotulo: tau.abas.auditoria, para: '/configuracoes?aba=auditoria' }] : []),
  ];
  return (
    <div className="space-y-4">
      {abas.length > 1 && <AbasModulo rotulo={t.menu.configuracoes} abas={abas} />}
      {naAuditoria ? <Auditoria /> : <Usuarios />}
    </div>
  );
}
