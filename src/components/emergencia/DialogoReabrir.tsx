import { useState } from 'react';
import { te } from '../../i18n/pt-BR/emergencia';
import { ErroConflito, ErroValidacao } from '../../services/erros';
import { leitosParaObservacao, reabrir } from '../../services/emergencia';
import type { AtendimentoDetalhado, LeitoAvaliado } from '../../types';
import { horaDoInstante } from '../../utils/datas';
import { DialogoMotivo } from '../leitos/DialogoMotivo';
import { SeletorLeito } from '../leitos/SeletorLeito';

const d = te.dialogos;

interface DialogoReabrirProps {
  atendimento: AtendimentoDetalhado | null;
  aoFechar: () => void;
  aoReaberto: (obitoDesfeito: boolean) => void;
  aoErro: (erro: unknown) => void;
}

/**
 * E9: motivo da correção, dentro da janela de 2 h. Se o leito de observação original já
 * foi ocupado, o diálogo mostra os leitos de observação para escolher outro e tenta de novo.
 */
export function DialogoReabrir({ atendimento, aoFechar, aoReaberto, aoErro }: DialogoReabrirProps) {
  const [outros, setOutros] = useState<LeitoAvaliado[] | null>(null);
  const [leitoId, setLeitoId] = useState('');
  const [erroLeito, setErroLeito] = useState<string | undefined>();

  const [idAntes, setIdAntes] = useState(atendimento?.id);
  if (atendimento?.id !== idAntes) {
    setIdAntes(atendimento?.id);
    setOutros(null);
    setLeitoId('');
    setErroLeito(undefined);
  }

  return (
    <DialogoMotivo
      aberto={atendimento !== null}
      titulo={atendimento ? d.reabrirTitulo(atendimento.numero) : ''}
      descricao={
        atendimento?.reabrirAte
          ? `${d.reabrirDescricao} ${te.detalheTela.reabrirAte(horaDoInstante(atendimento.reabrirAte))}`
          : d.reabrirDescricao
      }
      rotulo={d.motivoReabrir}
      rotuloConfirmar={d.reabrir}
      aoFechar={aoFechar}
      aoConfirmar={async (motivo) => {
        const a = atendimento!;
        if (outros && !leitoId) {
          setErroLeito(d.outroLeito);
          throw new Error(d.outroLeito);
        }
        try {
          const r = await reabrir(a.id, motivo, a.versao, outros ? leitoId : undefined);
          aoReaberto(r.obitoDesfeito);
        } catch (e) {
          if (e instanceof ErroConflito && e.codigo === 'leito_indisponivel') {
            setLeitoId('');
            setOutros(await leitosParaObservacao(a.id));
            setErroLeito(d.outroLeito);
            throw new Error(d.outroLeito);
          }
          // Motivo inválido e E-14 ficam no diálogo; o resto (E-18, E-05…) fecha com aviso.
          if (
            e instanceof ErroValidacao ||
            (e instanceof ErroConflito && e.codigo.startsWith('paciente_'))
          )
            throw e;
          aoErro(e);
        }
      }}
    >
      {outros && (
        <SeletorLeito
          avaliados={outros}
          valor={leitoId}
          aoMudar={(id) => {
            setLeitoId(id);
            setErroLeito(undefined);
          }}
          rotulo={d.leitoObservacao}
          nome="leitoReabrir"
          erro={erroLeito}
        />
      )}
    </DialogoMotivo>
  );
}
