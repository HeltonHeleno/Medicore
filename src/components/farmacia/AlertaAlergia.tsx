import { OctagonAlert } from 'lucide-react';
import { tf } from '../../i18n/pt-BR/farmacia';
import type { CorrespondenciaAlergia } from '../../utils/alergia';
import { Campo } from '../ui/form/Campo';
import { Checkbox } from '../ui/form/Checkbox';
import { Textarea } from '../ui/form/Textarea';

interface AlertaAlergiaProps {
  correspondencia: CorrespondenciaAlergia;
  /** Nome do medicamento como aparece no item (ex.: "Amoxicilina 500 mg"). */
  medicamento: string;
  ciente: boolean;
  aoMudarCiente: (ciente: boolean) => void;
  justificativa: string;
  aoMudarJustificativa: (texto: string) => void;
  erroCiente?: string;
  erroJustificativa?: string;
  /** Prefixo dos nomes no formulário (ex.: `itens.0`), para o `ResumoErros` levar ao campo. */
  prefixo: string;
}

/**
 * R-F8 / A10: possível alergia num item da dispensação. Só a faixa do alerta é
 * `role="alert"`, e o texto dela não muda, então o leitor de tela anuncia **uma vez**, ao
 * aparecer. A caixa "Ciente" e a justificativa ficam fora da região, para não repetir o
 * anúncio a cada letra. Nunca bloqueia: com a justificativa, a dispensação segue (D14).
 */
export function AlertaAlergia({
  correspondencia,
  medicamento,
  ciente,
  aoMudarCiente,
  justificativa,
  aoMudarJustificativa,
  erroCiente,
  erroJustificativa,
  prefixo,
}: AlertaAlergiaProps) {
  const a = tf.alertaAlergia;
  return (
    <div className="space-y-3 rounded-lg border border-danger/40 bg-danger-bg p-3">
      <div role="alert" className="flex items-start gap-2.5">
        <OctagonAlert size={20} aria-hidden className="mt-0.5 shrink-0 text-danger" />
        <div className="min-w-0 text-[13.5px]">
          <p className="font-semibold text-danger">
            {a.titulo}: {correspondencia.termo}
          </p>
          <p>{a.detalhe(correspondencia.termo, correspondencia.campo, medicamento)}</p>
          <p className="mt-0.5 text-[12.5px] text-text-muted">{tf.avisoAlergia}</p>
        </div>
      </div>
      <Checkbox
        name={`${prefixo}.cienteAlergia`}
        rotulo={a.ciente}
        checked={ciente}
        onChange={(e) => aoMudarCiente(e.target.checked)}
        erro={erroCiente}
      />
      {ciente && (
        <Campo
          rotulo={a.justificativa}
          nome={`${prefixo}.justificativaAlergia`}
          obrigatorio
          dica={a.justificativaDica}
          erro={erroJustificativa}
        >
          <Textarea
            value={justificativa}
            onChange={(e) => aoMudarJustificativa(e.target.value)}
            maxLength={300}
            rows={2}
          />
        </Campo>
      )}
    </div>
  );
}
