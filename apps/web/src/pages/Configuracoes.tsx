/**
 * Configurações. Fase 28: no modo API, o Administrador cuida dos usuários aqui (BL-02.5). As
 * outras configurações chegam com o BL-50.
 */
import { t } from '@medicore/dominio/i18n/pt-BR';
import { usePermissao } from '../hooks/useSessao';
import { COM_LOGIN } from '../services/acesso';
import Placeholder from './Placeholder';
import Usuarios from './acesso/Usuarios';

export default function Configuracoes() {
  const admin = usePermissao('usuarios.administrar');
  if (COM_LOGIN && admin) return <Usuarios />;
  return <Placeholder titulo={t.menu.configuracoes} />;
}
