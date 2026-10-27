import { useState } from 'react';
import { Campo } from '../../components/ui/form/Campo';
import { Checkbox } from '../../components/ui/form/Checkbox';
import { Combobox } from '../../components/ui/form/Combobox';
import { Input } from '../../components/ui/form/Input';
import { InputMascarado } from '../../components/ui/form/InputMascarado';
import { RadioGroup } from '../../components/ui/form/RadioGroup';
import { ResumoErros } from '../../components/ui/form/ResumoErros';
import { SecaoFormulario } from '../../components/ui/form/SecaoFormulario';
import { Select } from '../../components/ui/form/Select';
import { Textarea } from '../../components/ui/form/Textarea';
import { t } from '../../i18n/pt-BR';
import { listarPacientes } from '../../services/pacientes';
import { UFS, type PacienteResumo } from '../../types';

const v = t.vitrine;
const buscarPacientes = (termo: string) =>
  listarPacientes({ busca: termo, porPagina: 8 }).then((r) => r.itens);

/** Vitrine: campos de formulário em todos os estados. */
export function VitrineFormularios() {
  const [cpf, setCpf] = useState('52998224725');
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('0131');
  const [convenio, setConvenio] = useState<'particular' | 'convenio'>('particular');
  const [paciente, setPaciente] = useState<PacienteResumo | null>(null);

  return (
    <div className="space-y-5">
      <SecaoFormulario titulo={v.formulario} descricao={v.formularioDescricao} colunas={2}>
        <Campo rotulo={v.nome} nome="vitrine-nome" obrigatorio dica={v.nomeDica}>
          <Input defaultValue="Ana Paula Silva" autoComplete="off" />
        </Campo>
        <Campo rotulo={v.nome} nome="vitrine-nome-erro" obrigatorio erro={v.nomeErro}>
          <Input defaultValue="Ana" autoComplete="off" />
        </Campo>
        <Campo rotulo={v.desabilitado}>
          <Input disabled defaultValue={v.desabilitadoValor} />
        </Campo>
        <Campo rotulo={v.somenteLeitura}>
          <Input readOnly defaultValue={v.somenteLeituraValor} />
        </Campo>
        <Campo rotulo={v.uf} obrigatorio>
          <Select opcoes={UFS.map((uf) => ({ valor: uf, rotulo: uf }))} defaultValue="" />
        </Campo>
        <Campo rotulo={v.observacoes} className="sm:col-span-2">
          <Textarea maxLength={200} defaultValue="Paciente prefere atendimento pela manhã." />
        </Campo>
      </SecaoFormulario>

      <SecaoFormulario titulo={v.mascaras} colunas={3}>
        <Campo rotulo={v.cpf} obrigatorio>
          <InputMascarado mascara="cpf" value={cpf} onChange={setCpf} />
        </Campo>
        <Campo rotulo={v.telefone}>
          <InputMascarado
            mascara="telefone"
            value={telefone}
            onChange={setTelefone}
            autoComplete="tel"
          />
        </Campo>
        <Campo
          rotulo={v.cep}
          nome="vitrine-cep"
          erro={cep.length < 8 ? t.validacao.cepInvalido : undefined}
        >
          <InputMascarado mascara="cep" value={cep} onChange={setCep} />
        </Campo>
      </SecaoFormulario>

      <SecaoFormulario titulo={v.escolhas} colunas={2}>
        <RadioGroup
          legenda={v.convenio}
          nome="vitrine-convenio"
          obrigatorio
          horizontal
          valor={convenio}
          aoMudar={setConvenio}
          opcoes={[
            { valor: 'particular', rotulo: v.particular },
            { valor: 'convenio', rotulo: v.convenioPlano },
          ]}
        />
        <Checkbox name="vitrine-aceite" rotulo={v.aceite} descricao={v.aceiteDescricao} />
        <Campo rotulo={v.pacienteRotulo} dica={v.pacienteDica} className="sm:col-span-2">
          <Combobox
            buscar={buscarPacientes}
            valor={paciente}
            aoMudar={setPaciente}
            paraTexto={(p) => p.nomeExibicao}
            chave={(p) => p.id}
            renderizarOpcao={(p) => (
              <span className="flex justify-between gap-3">
                <span>{p.nomeExibicao}</span>
                <span className="text-[12.5px] text-text-muted tabular-nums">{p.cpfMascarado}</span>
              </span>
            )}
          />
        </Campo>
      </SecaoFormulario>

      <section aria-label={v.resumoErros}>
        <ResumoErros
          erros={[
            { campo: 'vitrine-nome-erro', rotulo: v.nome, mensagem: v.nomeErro },
            { campo: 'vitrine-cep', rotulo: v.cep, mensagem: t.validacao.cepInvalido },
          ]}
        />
      </section>
    </div>
  );
}
