import { RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useConfirmar } from '../../hooks/useConfirmar';
import { useToast } from '../../hooks/useToast';
import { t } from '../../i18n/pt-BR';
import { restaurarDadosExemplo } from '../../services/demo';

/** Botão "Restaurar dados de exemplo" da vitrine (só existe em desenvolvimento). */
export function VitrineDados() {
  const confirmar = useConfirmar();
  const toast = useToast();
  const d = t.demo;

  async function restaurar() {
    const ok = await confirmar({
      titulo: d.restaurarTitulo,
      mensagem: d.restaurarMensagem,
      rotuloConfirmar: d.restaurarConfirmar,
      perigo: true,
    });
    if (!ok) return;
    restaurarDadosExemplo();
    toast.sucesso(d.restaurados);
  }

  return (
    <Card titulo={d.dadosTitulo}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-[60ch] text-[14px] text-text-muted">{d.dadosDescricao}</p>
        <Button
          variante="contornoPerigo"
          iconeEsquerda={<RotateCcw size={16} />}
          onClick={restaurar}
        >
          {d.restaurar}
        </Button>
      </div>
    </Card>
  );
}
