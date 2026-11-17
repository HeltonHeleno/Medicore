/** Fase 29 (BL-03.3) — "Histórico de acesso" no detalhe do paciente (Administrador e Gestão). */
import { tau } from '@medicore/dominio/i18n/pt-BR/auditoria';
import { usePermissao } from '../../hooks/useSessao';
import { useAsync } from '../../hooks/useAsync';
import { COM_LOGIN } from '../../services/acesso';
import { listarAuditoria } from '../../services/auditoria';
import { Card } from '../ui/Card';
import { ConteudoAsync } from '../ui/ConteudoAsync';
import { TabelaAuditoria } from './TabelaAuditoria';

const ULTIMOS = 10;

function Lista({ pacienteId }: { pacienteId: string }) {
  const estado = useAsync(
    () => listarAuditoria({ pacienteId, pagina: 1, porPagina: ULTIMOS }),
    [pacienteId],
  );
  return (
    <Card
      titulo={tau.historico.titulo}
      acao={{
        rotulo: tau.historico.verTudo,
        href: `/configuracoes?aba=auditoria&pacienteId=${encodeURIComponent(pacienteId)}`,
      }}
    >
      <p className="mb-2 text-[13px] text-text-muted">{tau.historico.descricao}</p>
      <ConteudoAsync
        estado={estado}
        vazio={tau.historico.vazio}
        estaVazio={(d) => d.itens.length === 0}
      >
        {(d) => <TabelaAuditoria registros={d.itens} mostrarPaciente={false} />}
      </ConteudoAsync>
    </Card>
  );
}

/** Só com login e para quem consulta a auditoria; sem isso, não aparece nada. */
export function HistoricoAcesso({ pacienteId }: { pacienteId: string }) {
  const pode = usePermissao('auditoria.ver');
  if (!COM_LOGIN || !pode) return null;
  return <Lista pacienteId={pacienteId} />;
}
