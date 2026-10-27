import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useForm,
  type DefaultValues,
  type FieldErrors,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { useBlocker } from 'react-router-dom';
import type { z } from 'zod';
import type { ItemErro } from '../components/ui/form/ResumoErros';
import { t } from '../i18n/pt-BR';
import { aplicarErrosNoFormulario, ErroConflito, ErroValidacao } from '../services/erros';
import { useConfirmar } from './useConfirmar';
import { useToast } from './useToast';

/** Achata os erros do RHF (inclusive aninhados, ex.: endereco.cep) na ordem dos campos. */
export function listarErros(erros: FieldErrors, prefixo = ''): ItemErro[] {
  const lista: ItemErro[] = [];
  for (const [chave, valor] of Object.entries(erros)) {
    if (!valor || chave === 'root') continue;
    const campo = prefixo ? `${prefixo}.${chave}` : chave;
    if (typeof (valor as { message?: unknown }).message === 'string') {
      lista.push({ campo, mensagem: (valor as { message: string }).message });
    } else if (typeof valor === 'object') {
      lista.push(...listarErros(valor as FieldErrors, campo));
    }
  }
  return lista;
}

/** Primeiro campo apontado por um erro do serviço. */
function campoDoErro(erro: unknown): string | undefined {
  if (erro instanceof ErroValidacao) return Object.keys(erro.campos)[0];
  if (erro instanceof ErroConflito) return erro.campo;
  return undefined;
}

interface Opcoes<Entrada extends FieldValues, Saida> {
  esquema: z.ZodType<Saida, Entrada>;
  valoresIniciais: DefaultValues<Entrada>;
  /**
   * Grava. Se navegar ao final, a saída não é bloqueada. Erros do serviço vão para os campos.
   * Devolver `false` indica que o usuário desistiu (ex.: não confirmou a troca de CPF).
   */
  aoEnviar: (dados: Saida) => Promise<void | boolean>;
  /** Chamado com o erro do serviço antes de aplicá-lo (ex.: guardar `detalhes.id`). */
  aoErroServico?: (erro: unknown) => void;
  /** Rótulos dos campos para o resumo de erros ("cpf" → "CPF"). */
  rotulos?: Partial<Record<string, string>>;
}

/**
 * Formulário de cadastro/edição:
 * - react-hook-form + zod, validando ao sair de cada campo (`onTouched`);
 * - ao salvar com erros: foco no 1º campo inválido e resumo com links;
 * - erros do serviço (CPF duplicado, horário ocupado…) aparecem no campo certo;
 *   os demais viram toast de erro, sem perder o que foi digitado;
 * - sair com alterações não salvas pede confirmação (navegação interna e fechar a aba).
 */
export function useFormularioEntidade<Entrada extends FieldValues, Saida>({
  esquema,
  valoresIniciais,
  aoEnviar,
  aoErroServico,
  rotulos = {},
}: Opcoes<Entrada, Saida>) {
  const form = useForm<Entrada, unknown, Saida>({
    resolver: zodResolver(esquema),
    defaultValues: valoresIniciais,
    mode: 'onTouched',
    shouldFocusError: true,
  });
  const toast = useToast();
  const confirmar = useConfirmar();
  const [enviando, setEnviando] = useState(false);
  const salvo = useRef(false);
  const { isDirty, errors, submitCount } = form.formState;

  // Bloqueio de saída (M1): só com alterações e quando não acabou de salvar.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !salvo.current && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    let ativo = true;
    void confirmar({
      titulo: t.formulario.descartarTitulo,
      mensagem: t.formulario.descartarMensagem,
      rotuloConfirmar: t.formulario.descartar,
      rotuloCancelar: t.formulario.continuarEditando,
      perigo: true,
    }).then((sair) => {
      if (!ativo) return;
      if (sair) blocker.proceed();
      else blocker.reset();
    });
    return () => {
      ativo = false;
    };
  }, [blocker, confirmar]);

  // Fechar ou recarregar a aba com alterações.
  useEffect(() => {
    if (!isDirty) return;
    const aoSair = (e: BeforeUnloadEvent) => {
      if (salvo.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', aoSair);
    return () => window.removeEventListener('beforeunload', aoSair);
  }, [isDirty]);

  const enviar = useCallback(
    (evento?: { preventDefault?: () => void }) =>
      form.handleSubmit(async (dados) => {
        setEnviando(true);
        salvo.current = true;
        try {
          if ((await aoEnviar(dados)) === false) salvo.current = false;
        } catch (erro) {
          salvo.current = false;
          aoErroServico?.(erro);
          const aplicado = aplicarErrosNoFormulario(erro, (campo, e) =>
            form.setError(campo as Path<Entrada>, e),
          );
          const campo = campoDoErro(erro);
          if (aplicado && campo) form.setFocus(campo as Path<Entrada>);
          else toast.erro(erro instanceof Error ? erro.message : t.erros.inesperadoTitulo);
        } finally {
          setEnviando(false);
        }
      })(evento as never),
    [aoEnviar, aoErroServico, form, toast],
  );

  const resumo: ItemErro[] =
    submitCount > 0 ? listarErros(errors).map((e) => ({ ...e, rotulo: rotulos[e.campo] })) : [];

  return { form, enviar, enviando, resumo, tentativa: submitCount };
}
