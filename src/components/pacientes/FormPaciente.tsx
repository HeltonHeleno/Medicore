import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Link } from 'react-router-dom';
import type { z } from 'zod';
import { useFormularioEntidade } from '../../hooks/useFormularioEntidade';
import { t } from '../../i18n/pt-BR';
import {
  esquemaPaciente,
  SEXOS,
  TIPOS_SANGUINEOS,
  type DadosPaciente,
} from '../../schemas/paciente';
import { buscarCep } from '../../services/cep';
import { ErroConflito } from '../../services/erros';
import { pacienteComCpf } from '../../services/pacientes';
import { UFS, type Paciente } from '../../types';
import { dataValida, formatarData, dataDoInstante, hojeNoFuso, idade } from '../../utils/datas';
import { cpfValido, somenteDigitos } from '../../utils/validacao';
import { Button } from '../ui/Button';
import { BarraAcoesFormulario } from '../ui/form/BarraAcoesFormulario';
import { Campo } from '../ui/form/Campo';
import { Checkbox } from '../ui/form/Checkbox';
import { idDoCampo } from '../ui/form/estilos';
import { Input } from '../ui/form/Input';
import { InputMascarado } from '../ui/form/InputMascarado';
import { RadioGroup } from '../ui/form/RadioGroup';
import { ResumoErros } from '../ui/form/ResumoErros';
import { SecaoFormulario } from '../ui/form/SecaoFormulario';
import { Select } from '../ui/form/Select';
import { Textarea } from '../ui/form/Textarea';
import { valoresDoPaciente, type ValoresPaciente } from './valoresPaciente';

const p = t.pacientes;
const c = p.campos;

const ROTULOS: Record<string, string> = {
  nome: c.nome,
  nomeSocial: c.nomeSocial,
  cpf: c.cpf,
  dataNascimento: c.dataNascimento,
  sexo: c.sexo,
  telefone: c.telefone,
  email: c.email,
  'endereco.cep': c.cep,
  'endereco.logradouro': c.logradouro,
  'endereco.numero': c.numero,
  'endereco.complemento': c.complemento,
  'endereco.bairro': c.bairro,
  'endereco.cidade': c.cidade,
  'endereco.uf': c.uf,
  'convenio.tipo': c.tipoConvenio,
  'convenio.nome': c.convenioNome,
  'convenio.carteirinha': c.carteirinha,
  'convenio.validade': c.validade,
  responsavel: p.secoes.responsavel,
  'responsavel.nome': c.responsavelNome,
  'responsavel.cpf': c.responsavelCpf,
  'responsavel.parentesco': c.parentesco,
  'responsavel.telefone': c.responsavelTelefone,
  alergias: c.alergias,
  'contatoEmergencia.nome': `${p.secoes.emergencia}: ${c.emergenciaNome}`,
  'contatoEmergencia.telefone': `${p.secoes.emergencia}: ${c.emergenciaTelefone}`,
  'contatoEmergencia.parentesco': `${p.secoes.emergencia}: ${c.emergenciaParentesco}`,
  observacoes: c.observacoes,
  consentimentoLgpd: p.secoes.consentimento,
};

const CAMPOS_CEP = ['logradouro', 'bairro', 'cidade', 'uf'] as const;
type EstadoCep = 'ocioso' | 'buscando' | 'encontrado' | 'nao_encontrado' | 'falhou';

interface FormPacienteProps {
  /** Paciente em edição (ausente no cadastro). */
  paciente?: Paciente;
  /** Grava. Devolva `false` se o usuário desistiu (ex.: não confirmou a troca de CPF). */
  aoEnviar: (dados: DadosPaciente) => Promise<void | boolean>;
  aoCancelar: () => void;
  /** Conteúdo acima das seções (ex.: aviso de paciente inativo). */
  topo?: ReactNode;
  /** Acesso ao `reset` do formulário (recarregar após conflito de versão). */
  aoPronto?: (api: { reset: (valores: ValoresPaciente) => void }) => void;
}

/** Formulário de paciente (P1 e P2), com todas as regras de tela da especificação. */
export function FormPaciente({
  paciente,
  aoEnviar,
  aoCancelar,
  topo,
  aoPronto,
}: FormPacienteProps) {
  const editando = Boolean(paciente);
  const [cpfExistente, setCpfExistente] = useState<{ id: string; nomeExibicao: string } | null>(
    null,
  );
  const [verificandoCpf, setVerificandoCpf] = useState(false);
  const [estadoCep, setEstadoCep] = useState<EstadoCep>('ocioso');

  const { form, enviar, enviando, resumo, tentativa } = useFormularioEntidade({
    esquema: esquemaPaciente as unknown as z.ZodType<DadosPaciente, ValoresPaciente>,
    valoresIniciais: valoresDoPaciente(paciente),
    aoEnviar,
    rotulos: ROTULOS,
    aoErroServico: (erro) => {
      if (erro instanceof ErroConflito && erro.codigo === 'cpf_duplicado' && erro.detalhes?.id) {
        setCpfExistente({ id: String(erro.detalhes.id), nomeExibicao: '' });
      }
    },
  });
  const {
    register,
    control,
    formState,
    setValue,
    getValues,
    getFieldState,
    setFocus,
    setError,
    trigger,
  } = form;
  const { errors, isDirty } = formState;

  useEffect(() => {
    aoPronto?.({ reset: (valores) => form.reset(valores) });
  }, [aoPronto, form]);

  // Foco inicial no nome (P1, passo 1).
  useEffect(() => {
    if (!editando) setFocus('nome');
  }, [editando, setFocus]);

  const [dataNascimento, tipoConvenio, validade, cep, responsavel] = useWatch({
    control,
    name: ['dataNascimento', 'convenio.tipo', 'convenio.validade', 'endereco.cep', 'responsavel'],
  });

  const hoje = hojeNoFuso();
  const idadeAtual =
    dataNascimento && dataValida(dataNascimento) && dataNascimento <= hoje
      ? idade(dataNascimento)
      : null;
  const menor = idadeAtual !== null && idadeAtual < 18;
  const temResponsavel = Object.values(responsavel ?? {}).some((v) => String(v ?? '').trim());
  const mostrarResponsavel = menor || temResponsavel;
  const convenioVencido =
    tipoConvenio === 'convenio' && validade && dataValida(validade) && validade < hoje;

  // ── R-P1: CPF disponível ao sair do campo ──
  async function verificarCpf() {
    const valor = getValues('cpf');
    if (!(await trigger('cpf')) || !cpfValido(valor)) return;
    setVerificandoCpf(true);
    try {
      const existente = await pacienteComCpf(somenteDigitos(valor), paciente?.id);
      setCpfExistente(existente);
      if (existente) setError('cpf', { type: 'cpf_duplicado', message: t.erros.cpfDuplicado });
    } finally {
      setVerificandoCpf(false);
    }
  }

  // ── A6: busca de CEP ──
  const ultimoCep = useRef(somenteDigitos(paciente?.endereco?.cep ?? ''));
  const controleCep = useRef<AbortController | null>(null);
  const preenchidosPeloCep = useRef<Partial<Record<(typeof CAMPOS_CEP)[number], string>>>({});

  useEffect(() => {
    const digitos = somenteDigitos(cep ?? '');
    if (digitos.length !== 8) {
      if (digitos !== ultimoCep.current) setEstadoCep('ocioso');
      return;
    }
    if (digitos === ultimoCep.current) return;
    ultimoCep.current = digitos;
    controleCep.current?.abort();
    const controle = new AbortController();
    controleCep.current = controle;
    setEstadoCep('buscando');

    buscarCep(digitos, controle.signal).then(
      (endereco) => {
        if (controle.signal.aborted) return;
        if (!endereco) {
          setEstadoCep('nao_encontrado');
          return;
        }
        for (const campo of CAMPOS_CEP) {
          const nome = `endereco.${campo}` as const;
          const atual = getValues(nome);
          // Só preenche o que o usuário não digitou (o que o CEP anterior preencheu pode trocar).
          const livre =
            !getFieldState(nome).isDirty || !atual || atual === preenchidosPeloCep.current[campo];
          if (livre) {
            setValue(nome, endereco[campo], { shouldDirty: true, shouldValidate: Boolean(atual) });
            preenchidosPeloCep.current[campo] = endereco[campo];
          }
        }
        setEstadoCep('encontrado');
        setFocus('endereco.numero');
      },
      () => {
        if (!controle.signal.aborted) setEstadoCep('falhou');
      },
    );
  }, [cep, getFieldState, getValues, setFocus, setValue]);

  useEffect(() => () => controleCep.current?.abort(), []);

  const dicaCep: Record<EstadoCep, ReactNode> = {
    ocioso: null,
    buscando: (
      <span className="inline-flex items-center gap-1.5">
        <Loader2 size={13} aria-hidden className="animate-spin" />
        {p.cep.buscando}
      </span>
    ),
    encontrado: p.cep.encontrado,
    nao_encontrado: <span className="text-danger">{t.erros.cepNaoEncontrado}</span>,
    falhou: <span className="text-danger">{t.erros.cepFalhou}</span>,
  };

  const campoMascarado = (
    nome:
      | 'cpf'
      | 'telefone'
      | 'endereco.cep'
      | 'responsavel.cpf'
      | 'responsavel.telefone'
      | 'contatoEmergencia.telefone',
    mascara: 'cpf' | 'telefone' | 'cep',
    aoSair?: () => void,
  ) => (
    <Controller
      control={control}
      name={nome}
      render={({ field }) => (
        <InputMascarado
          ref={field.ref}
          name={field.name}
          mascara={mascara}
          value={field.value}
          onChange={field.onChange}
          onBlur={() => {
            field.onBlur();
            aoSair?.();
          }}
          autoComplete={mascara === 'telefone' ? 'tel' : mascara === 'cep' ? 'postal-code' : 'off'}
        />
      )}
    />
  );

  const erroDe = (caminho: string): string | undefined => {
    let atual: unknown = errors;
    for (const parte of caminho.split('.'))
      atual = (atual as Record<string, unknown> | undefined)?.[parte];
    return (atual as { message?: string } | undefined)?.message;
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-5 pb-2">
      {topo}
      <ResumoErros erros={resumo} tentativa={tentativa} />

      <SecaoFormulario titulo={p.secoes.dadosPessoais} colunas={2}>
        <Campo
          rotulo={c.nome}
          nome="nome"
          obrigatorio
          erro={erroDe('nome')}
          className="sm:col-span-2"
        >
          <Input {...register('nome')} autoComplete="name" maxLength={120} />
        </Campo>
        <Campo
          rotulo={c.nomeSocial}
          nome="nomeSocial"
          dica={c.nomeSocialDica}
          erro={erroDe('nomeSocial')}
        >
          <Input {...register('nomeSocial')} autoComplete="off" maxLength={120} />
        </Campo>
        <Campo
          rotulo={c.cpf}
          nome="cpf"
          obrigatorio
          erro={erroDe('cpf')}
          dica={
            verificandoCpf ? (
              p.cpfVerificando
            ) : errors.cpf?.type === 'cpf_duplicado' && cpfExistente ? (
              <Link
                to={`/pacientes/${cpfExistente.id}`}
                className="font-medium text-on-primary-light underline underline-offset-2"
              >
                {t.erros.abrirExistente}
                {cpfExistente.nomeExibicao && ` (${cpfExistente.nomeExibicao})`}
              </Link>
            ) : undefined
          }
        >
          {campoMascarado('cpf', 'cpf', verificarCpf)}
        </Campo>
        <Campo
          rotulo={c.dataNascimento}
          nome="dataNascimento"
          obrigatorio
          erro={erroDe('dataNascimento')}
          dica={
            idadeAtual !== null ? (
              <span aria-live="polite">
                {p.idadeCalculada(idadeAtual)}
                {menor && ` · ${p.menorDeIdade}`}
              </span>
            ) : undefined
          }
        >
          <Input type="date" max={hoje} {...register('dataNascimento')} />
        </Campo>
        <Campo rotulo={c.sexo} nome="sexo" obrigatorio erro={erroDe('sexo')}>
          <Select
            {...register('sexo')}
            opcoes={SEXOS.map((s) => ({ valor: s, rotulo: p.sexos[s] }))}
          />
        </Campo>
      </SecaoFormulario>

      {mostrarResponsavel && (
        <SecaoFormulario
          titulo={p.secoes.responsavel}
          descricao={p.secoes.responsavelDescricao}
          colunas={2}
        >
          {erroDe('responsavel') && (
            <p
              id={idDoCampo('responsavel')}
              tabIndex={-1}
              className="rounded-md bg-danger-bg px-3 py-2 text-[13.5px] font-medium text-danger outline-none sm:col-span-2"
            >
              {erroDe('responsavel')}
            </p>
          )}
          <Campo
            rotulo={c.responsavelNome}
            nome="responsavel.nome"
            obrigatorio={menor}
            erro={erroDe('responsavel.nome')}
          >
            <Input {...register('responsavel.nome')} autoComplete="off" maxLength={120} />
          </Campo>
          <Campo
            rotulo={c.responsavelCpf}
            nome="responsavel.cpf"
            obrigatorio={menor}
            erro={erroDe('responsavel.cpf')}
          >
            {campoMascarado('responsavel.cpf', 'cpf')}
          </Campo>
          <Campo
            rotulo={c.parentesco}
            nome="responsavel.parentesco"
            obrigatorio={menor}
            erro={erroDe('responsavel.parentesco')}
          >
            <Input {...register('responsavel.parentesco')} autoComplete="off" maxLength={40} />
          </Campo>
          <Campo
            rotulo={c.responsavelTelefone}
            nome="responsavel.telefone"
            obrigatorio={menor}
            erro={erroDe('responsavel.telefone')}
          >
            {campoMascarado('responsavel.telefone', 'telefone')}
          </Campo>
        </SecaoFormulario>
      )}

      <SecaoFormulario titulo={p.secoes.contato} colunas={2}>
        <Campo rotulo={c.telefone} nome="telefone" obrigatorio erro={erroDe('telefone')}>
          {campoMascarado('telefone', 'telefone')}
        </Campo>
        <Campo rotulo={c.email} nome="email" erro={erroDe('email')}>
          <Input type="email" {...register('email')} autoComplete="email" maxLength={120} />
        </Campo>
      </SecaoFormulario>

      <SecaoFormulario
        titulo={p.secoes.endereco}
        descricao={p.secoes.enderecoDescricao}
        colunas={3}
      >
        <Campo
          rotulo={c.cep}
          nome="endereco.cep"
          erro={erroDe('endereco.cep')}
          dica={dicaCep[estadoCep]}
        >
          {campoMascarado('endereco.cep', 'cep')}
        </Campo>
        <Campo
          rotulo={c.logradouro}
          nome="endereco.logradouro"
          erro={erroDe('endereco.logradouro')}
          className="sm:col-span-2"
        >
          <Input
            {...register('endereco.logradouro')}
            autoComplete="address-line1"
            maxLength={120}
          />
        </Campo>
        <Campo rotulo={c.numero} nome="endereco.numero" erro={erroDe('endereco.numero')}>
          <Input {...register('endereco.numero')} autoComplete="off" maxLength={10} />
        </Campo>
        <Campo
          rotulo={c.complemento}
          nome="endereco.complemento"
          erro={erroDe('endereco.complemento')}
          className="sm:col-span-2"
        >
          <Input
            {...register('endereco.complemento')}
            autoComplete="address-line2"
            maxLength={60}
          />
        </Campo>
        <Campo rotulo={c.bairro} nome="endereco.bairro" erro={erroDe('endereco.bairro')}>
          <Input {...register('endereco.bairro')} autoComplete="off" maxLength={80} />
        </Campo>
        <Campo rotulo={c.cidade} nome="endereco.cidade" erro={erroDe('endereco.cidade')}>
          <Input {...register('endereco.cidade')} autoComplete="address-level2" maxLength={80} />
        </Campo>
        <Campo rotulo={c.uf} nome="endereco.uf" erro={erroDe('endereco.uf')}>
          <Select
            {...register('endereco.uf')}
            opcoes={UFS.map((uf) => ({ valor: uf, rotulo: uf }))}
          />
        </Campo>
      </SecaoFormulario>

      <SecaoFormulario titulo={p.secoes.convenio} colunas={3}>
        <Controller
          control={control}
          name="convenio.tipo"
          render={({ field }) => (
            <RadioGroup
              legenda={c.tipoConvenio}
              nome="convenio.tipo"
              obrigatorio
              horizontal
              valor={field.value}
              aoMudar={field.onChange}
              aoSair={field.onBlur}
              opcoes={[
                { valor: 'particular', rotulo: c.particular },
                { valor: 'convenio', rotulo: c.convenio },
              ]}
              className="sm:col-span-full"
            />
          )}
        />
        {tipoConvenio === 'convenio' && (
          <>
            <Campo
              rotulo={c.convenioNome}
              nome="convenio.nome"
              obrigatorio
              erro={erroDe('convenio.nome')}
            >
              <Input {...register('convenio.nome')} autoComplete="off" maxLength={80} />
            </Campo>
            <Campo
              rotulo={c.carteirinha}
              nome="convenio.carteirinha"
              obrigatorio
              erro={erroDe('convenio.carteirinha')}
            >
              <Input {...register('convenio.carteirinha')} autoComplete="off" maxLength={30} />
            </Campo>
            <Campo
              rotulo={c.validade}
              nome="convenio.validade"
              erro={erroDe('convenio.validade')}
              dica={
                convenioVencido ? (
                  <span className="text-warning">{p.convenioVencido}</span>
                ) : undefined
              }
            >
              <Input type="date" {...register('convenio.validade')} />
            </Campo>
          </>
        )}
      </SecaoFormulario>

      <SecaoFormulario titulo={p.secoes.clinicas} colunas={2}>
        <Campo rotulo={c.tipoSanguineo} nome="tipoSanguineo" erro={erroDe('tipoSanguineo')}>
          <Select
            {...register('tipoSanguineo')}
            opcoes={TIPOS_SANGUINEOS.map((s) => ({ valor: s, rotulo: s }))}
          />
        </Campo>
        <div className="hidden sm:block" />
        <Campo rotulo={c.alergias} nome="alergias" dica={c.alergiasDica} erro={erroDe('alergias')}>
          <Textarea {...register('alergias')} maxLength={500} rows={3} />
        </Campo>
        <Campo rotulo={c.observacoes} nome="observacoes" erro={erroDe('observacoes')}>
          <Textarea {...register('observacoes')} maxLength={1000} rows={3} />
        </Campo>
      </SecaoFormulario>

      <SecaoFormulario
        titulo={p.secoes.emergencia}
        descricao={p.secoes.emergenciaDescricao}
        colunas={3}
      >
        <Campo
          rotulo={c.emergenciaNome}
          nome="contatoEmergencia.nome"
          erro={erroDe('contatoEmergencia.nome')}
        >
          <Input {...register('contatoEmergencia.nome')} autoComplete="off" maxLength={120} />
        </Campo>
        <Campo
          rotulo={c.emergenciaTelefone}
          nome="contatoEmergencia.telefone"
          erro={erroDe('contatoEmergencia.telefone')}
        >
          {campoMascarado('contatoEmergencia.telefone', 'telefone')}
        </Campo>
        <Campo
          rotulo={c.emergenciaParentesco}
          nome="contatoEmergencia.parentesco"
          erro={erroDe('contatoEmergencia.parentesco')}
        >
          <Input {...register('contatoEmergencia.parentesco')} autoComplete="off" maxLength={40} />
        </Campo>
      </SecaoFormulario>

      <SecaoFormulario titulo={p.secoes.consentimento} colunas={1}>
        {paciente ? (
          <p className="text-[14px] text-text-muted">
            {c.consentimentoRegistrado(formatarData(dataDoInstante(paciente.consentimentoLgpd.em)))}
          </p>
        ) : (
          <Checkbox
            {...register('consentimentoLgpd')}
            rotulo={c.consentimento}
            erro={erroDe('consentimentoLgpd')}
          />
        )}
      </SecaoFormulario>

      <BarraAcoesFormulario>
        <Button variante="contorno" onClick={aoCancelar}>
          {p.cancelar}
        </Button>
        <Button type="submit" disabled={enviando || (editando && !isDirty)}>
          {enviando ? p.salvando : p.salvar}
        </Button>
      </BarraAcoesFormulario>
    </form>
  );
}
