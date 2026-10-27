import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/feedback/Modal';
import { Campo } from '../../components/ui/form/Campo';
import { Input } from '../../components/ui/form/Input';
import { useConfirmar } from '../../hooks/useConfirmar';
import { useToast } from '../../hooks/useToast';
import { t } from '../../i18n/pt-BR';

const v = t.vitrine;

/** Vitrine: modal, diálogos de confirmação e notificações. */
export function VitrineFeedback() {
  const [modal, setModal] = useState(false);
  const [resposta, setResposta] = useState('');
  const confirmar = useConfirmar();
  const toast = useToast();

  const perguntar = async (opcoes: Parameters<typeof confirmar>[0]) =>
    setResposta((await confirmar(opcoes)) ? v.respostaConfirmou : v.respostaCancelou);

  return (
    <Card titulo={v.feedback}>
      <div className="flex flex-wrap items-center gap-3">
        <Button variante="contorno" onClick={() => setModal(true)}>
          {v.abrirModal}
        </Button>
        <Button
          variante="contorno"
          onClick={() =>
            perguntar({ titulo: v.confirmacaoTitulo, mensagem: v.confirmacaoMensagem })
          }
        >
          {v.confirmarSimples}
        </Button>
        <Button
          variante="contorno"
          onClick={() =>
            perguntar({
              titulo: v.confirmacaoTitulo,
              mensagem: v.confirmacaoMensagem,
              perigo: true,
              rotuloConfirmar: v.acaoInativar,
            })
          }
        >
          {v.confirmarPerigo}
        </Button>
        <Button
          variante="contorno"
          onClick={() =>
            perguntar({
              titulo: v.exclusaoTitulo,
              perigo: true,
              exigirTexto: v.textoExclusao,
              rotuloConfirmar: v.excluir,
            })
          }
        >
          {v.confirmarTexto}
        </Button>
        {resposta && (
          <output className="text-[13.5px] text-text-muted" aria-live="polite">
            {resposta}
          </output>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variante="suave" onClick={() => toast.sucesso(v.toastSucessoTexto)}>
          {v.toastSucesso}
        </Button>
        <Button
          variante="suave"
          onClick={() =>
            toast.aviso(v.toastAvisoTexto, {
              acao: { rotulo: v.verConsultas, aoClicar: () => undefined },
            })
          }
        >
          {v.toastAviso}
        </Button>
        <Button variante="suave" onClick={() => toast.erro(v.toastErroTexto)}>
          {v.toastErro}
        </Button>
      </div>

      <Modal
        aberto={modal}
        aoFechar={() => setModal(false)}
        titulo={v.modalTitulo}
        descricao={v.modalTexto}
        rodape={
          <>
            <Button variante="contorno" onClick={() => setModal(false)}>
              {t.formulario.cancelar}
            </Button>
            <Button onClick={() => setModal(false)}>{t.formulario.salvar}</Button>
          </>
        }
      >
        <Campo rotulo={v.nome}>
          <Input autoComplete="off" />
        </Campo>
      </Modal>
    </Card>
  );
}
