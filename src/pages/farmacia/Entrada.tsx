import { useEffect, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { BadgeEstoque } from '../../components/farmacia/BadgeEstoque';
import { Button } from '../../components/ui/Button';
import { BarraAcoesFormulario } from '../../components/ui/form/BarraAcoesFormulario';
import { Campo } from '../../components/ui/form/Campo';
import { CampoQuantidade } from '../../components/ui/form/CampoQuantidade';
import { Checkbox } from '../../components/ui/form/Checkbox';
import { Input } from '../../components/ui/form/Input';
import { RadioGroup } from '../../components/ui/form/RadioGroup';
import { ResumoErros } from '../../components/ui/form/ResumoErros';
import { SecaoFormulario } from '../../components/ui/form/SecaoFormulario';
import { Select } from '../../components/ui/form/Select';
import { CabecalhoPagina } from '../../components/ui/lista/CabecalhoPagina';
import { SkeletonLinhas } from '../../components/ui/Skeleton';
import { VALIDADE_CURTA_DIAS } from '../../config/limites';
import { useColecao } from '../../hooks/useColecao';
import { useConfirmar } from '../../hooks/useConfirmar';
import { useEstoque } from '../../hooks/useDadosOperacoes';
import { useFormularioEntidade } from '../../hooks/useFormularioEntidade';
import { useToast } from '../../hooks/useToast';
import { tf } from '../../i18n/pt-BR/farmacia';
import { COLECOES } from '../../services/colecoes-operacoes';
import { esquemaEntrada, type EntradaLote } from '../../schemas/farmacia';
import {
  nomeMedicamento,
  obterMedicamento,
  quantidadeComUnidade,
  registrarEntrada,
} from '../../services/farmacia';
import { formatarData, hojeNoFuso, somarDias } from '../../utils/datas';

const e = tf.entradaTela;

interface ValoresEntrada {
  medicamentoId: string;
  numero: string;
  validade: string;
  modo: 'unidades' | 'embalagens';
  quantidade: number | null;
  fabricante: string;
  notaFiscal: string;
  somarAoExistente: boolean;
  confirmarValidadeCurta: boolean;
}

const esquemaTela = z.preprocess(
  (v) => ({ ...(v as ValoresEntrada), quantidade: (v as ValoresEntrada).quantidade ?? undefined }),
  esquemaEntrada,
) as unknown as z.ZodType<EntradaLote, ValoresEntrada>;

const ROTULOS: Record<string, string> = {
  medicamentoId: e.medicamento,
  numero: e.numero,
  validade: e.validade,
  modo: e.modo,
  quantidade: e.quantidadeEmbalagens,
  fabricante: e.fabricante,
  notaFiscal: e.notaFiscal,
};

/** /farmacia/entrada — F2. Com `?medicamentoId=`, o medicamento vem escolhido. */
export default function Entrada() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirmar = useConfirmar();
  const ativos = useEstoque({ status: 'ativos', porPagina: 500 });

  const { form, enviar, enviando, resumo, tentativa } = useFormularioEntidade({
    esquema: esquemaTela,
    valoresIniciais: {
      medicamentoId: params.get('medicamentoId') ?? '',
      numero: '',
      validade: '',
      modo: 'unidades',
      quantidade: null,
      fabricante: '',
      notaFiscal: '',
      somarAoExistente: false,
      confirmarValidadeCurta: false,
    },
    rotulos: ROTULOS,
    aoEnviar: async (dados) => {
      let entrada = dados;
      // R-F2: validade a menos de 30 dias é aviso, com confirmação.
      if (
        typeof dados.validade === 'string' &&
        dados.validade < somarDias(hojeNoFuso(), VALIDADE_CURTA_DIAS)
      ) {
        const ok = await confirmar({
          titulo: e.curtaTitulo,
          mensagem: tf.regras.validadeCurta(VALIDADE_CURTA_DIAS),
          rotuloConfirmar: e.curtaConfirmar,
          rotuloCancelar: tf.voltar,
        });
        if (!ok) return false;
        entrada = { ...dados, confirmarValidadeCurta: true };
      }
      const lote = await registrarEntrada(entrada);
      const m = detalhe.data?.estoque.medicamento;
      if (m) {
        const recebido =
          dados.modo === 'embalagens' && m.unidadesPorEmbalagem
            ? Number(dados.quantidade) * m.unidadesPorEmbalagem
            : Number(dados.quantidade);
        toast.sucesso(
          tf.avisos.entradaRegistrada(
            quantidadeComUnidade(m, recebido),
            nomeMedicamento(m),
            lote.numero,
          ),
        );
      }
      navigate(`/farmacia/medicamentos/${lote.medicamentoId}`);
    },
  });
  const { register, control, setValue, formState } = form;
  const { errors } = formState;
  const [medicamentoId, numero, validade, modo, quantidade] = useWatch({
    control,
    name: ['medicamentoId', 'numero', 'validade', 'modo', 'quantidade'],
  });
  const detalhe = useColecao(
    () =>
      medicamentoId ? obterMedicamento(medicamentoId).catch(() => null) : Promise.resolve(null),
    [medicamentoId],
    COLECOES.farmacia,
  );
  const m = detalhe.data?.estoque.medicamento;
  const porEmbalagem = m?.unidadesPorEmbalagem;

  // Sem "unidades por embalagem", só dá para informar em unidades.
  useEffect(() => {
    if (m && !porEmbalagem && modo === 'embalagens') setValue('modo', 'unidades');
  }, [m, porEmbalagem, modo, setValue]);

  const loteIgual = detalhe.data?.lotes.find(
    (l) => l.numero.toUpperCase() === numero.trim().toUpperCase() && l.validade === validade,
  );
  const [somarAntes, setSomarAntes] = useState<string | undefined>();
  if (loteIgual?.id !== somarAntes) {
    setSomarAntes(loteIgual?.id);
    if (!loteIgual) setValue('somarAoExistente', false);
  }

  const erroDe = (campo: keyof ValoresEntrada) => errors[campo]?.message as string | undefined;
  const unidadeNome = m ? tf.unidades[m.unidade](2) : '';
  const comSaldo = (detalhe.data?.lotes ?? []).filter((l) => l.quantidadeAtual > 0);

  return (
    <>
      <CabecalhoPagina titulo={tf.entradaLote} descricao={e.descricao} />
      {!ativos.data ? (
        <div aria-busy="true">
          <SkeletonLinhas linhas={6} />
        </div>
      ) : (
        <form onSubmit={enviar} noValidate className="space-y-5 pb-2">
          <ResumoErros erros={resumo} tentativa={tentativa} />
          <SecaoFormulario titulo={e.secoes.medicamento} colunas={1}>
            <Campo
              rotulo={e.medicamento}
              nome="medicamentoId"
              obrigatorio
              erro={erroDe('medicamentoId')}
            >
              <Select
                {...register('medicamentoId')}
                opcoes={ativos.data.itens.map((x) => ({
                  valor: x.medicamento.id,
                  rotulo: `${nomeMedicamento(x.medicamento)} — ${tf.formas[x.medicamento.forma]}`,
                }))}
              />
            </Campo>
            {detalhe.data && m && (
              <div className="space-y-2 rounded-lg border border-border bg-bg px-4 py-3 text-[14px]">
                <p className="flex flex-wrap items-center gap-2">
                  <BadgeEstoque situacao={detalhe.data.estoque.situacao} />
                  {e.resumoMedicamento(
                    quantidadeComUnidade(m, detalhe.data.estoque.disponivel),
                    quantidadeComUnidade(m, m.estoqueMinimo),
                  )}
                </p>
                <div>
                  <p className="text-[12.5px] font-medium text-text-muted">{e.lotesExistentes}</p>
                  {comSaldo.length === 0 ? (
                    <p className="text-[13.5px] text-text-muted">{e.nenhumLote}</p>
                  ) : (
                    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13.5px]">
                      {comSaldo.map((l) => (
                        <li key={l.id}>
                          <span className="font-mono">{l.numero}</span> · {formatarData(l.validade)}{' '}
                          · {quantidadeComUnidade(m, l.quantidadeAtual)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </SecaoFormulario>

          <SecaoFormulario titulo={e.secoes.lote} colunas={2}>
            <Campo rotulo={e.numero} nome="numero" obrigatorio erro={erroDe('numero')}>
              <Input {...register('numero')} maxLength={30} autoComplete="off" />
            </Campo>
            <Campo rotulo={e.validade} nome="validade" obrigatorio erro={erroDe('validade')}>
              <Input type="date" min={hojeNoFuso()} {...register('validade')} />
            </Campo>
            {loteIgual && (
              <Checkbox
                {...register('somarAoExistente')}
                rotulo={e.somar(loteIgual.numero)}
                className="sm:col-span-2"
              />
            )}
            <Campo rotulo={e.fabricante} nome="fabricante" erro={erroDe('fabricante')}>
              <Input {...register('fabricante')} maxLength={80} />
            </Campo>
            <Campo rotulo={e.notaFiscal} nome="notaFiscal" erro={erroDe('notaFiscal')}>
              <Input {...register('notaFiscal')} maxLength={40} />
            </Campo>
          </SecaoFormulario>

          <SecaoFormulario titulo={e.secoes.quantidade} colunas={2}>
            {porEmbalagem ? (
              <Controller
                control={control}
                name="modo"
                render={({ field }) => (
                  <RadioGroup
                    legenda={e.modo}
                    nome="modo"
                    horizontal
                    opcoes={[
                      { valor: 'unidades', rotulo: e.modos.unidades },
                      { valor: 'embalagens', rotulo: e.modos.embalagens },
                    ]}
                    valor={field.value}
                    aoMudar={field.onChange}
                    className="sm:col-span-2"
                  />
                )}
              />
            ) : null}
            <Campo
              rotulo={
                modo === 'embalagens'
                  ? e.quantidadeEmbalagens
                  : unidadeNome
                    ? e.quantidadeUnidades(unidadeNome)
                    : tf.dialogos.quantidade
              }
              nome="quantidade"
              obrigatorio
              erro={erroDe('quantidade')}
              dica={
                modo === 'embalagens' && porEmbalagem && m && quantidade
                  ? tf.avisos.conversao(
                      quantidade,
                      porEmbalagem,
                      quantidadeComUnidade(m, quantidade * porEmbalagem),
                    )
                  : undefined
              }
            >
              <Controller
                control={control}
                name="quantidade"
                render={({ field }) => (
                  <CampoQuantidade
                    ref={field.ref}
                    name={field.name}
                    valor={field.value}
                    aoMudar={field.onChange}
                    aoSair={field.onBlur}
                    unidade={modo === 'embalagens' ? e.modos.embalagens.toLowerCase() : unidadeNome}
                  />
                )}
              />
            </Campo>
          </SecaoFormulario>

          <BarraAcoesFormulario>
            <Button
              variante="contorno"
              onClick={() =>
                navigate(medicamentoId ? `/farmacia/medicamentos/${medicamentoId}` : '/farmacia')
              }
            >
              {tf.cancelar}
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? tf.salvando : e.salvar}
            </Button>
          </BarraAcoesFormulario>
        </form>
      )}
    </>
  );
}
