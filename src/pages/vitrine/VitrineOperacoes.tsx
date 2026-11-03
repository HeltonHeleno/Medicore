import { useState, type ReactNode } from 'react';
import { AlertaAlergia } from '../../components/farmacia/AlertaAlergia';
import { BadgeEstoque, type SituacaoSelo } from '../../components/farmacia/BadgeEstoque';
import { BadgeRisco } from '../../components/emergencia/BadgeRisco';
import { CamposSinaisVitais } from '../../components/emergencia/CamposSinaisVitais';
import type { ValoresSinais } from '../../components/emergencia/sinais';
import { BadgeLeito } from '../../components/leitos/BadgeLeito';
import { CartaoLeito } from '../../components/leitos/CartaoLeito';
import { SeletorLeito } from '../../components/leitos/SeletorLeito';
import { ComboboxPaciente, type OpcaoPaciente } from '../../components/pacientes/ComboboxPaciente';
import { AbasModulo } from '../../components/ui/AbasModulo';
import { Card } from '../../components/ui/Card';
import { Campo } from '../../components/ui/form/Campo';
import { CampoQuantidade } from '../../components/ui/form/CampoQuantidade';
import { Select } from '../../components/ui/form/Select';
import { LinhaDoTempo } from '../../components/ui/LinhaDoTempo';
import { ResumoNumeros } from '../../components/ui/ResumoNumeros';
import { TempoDecorrido } from '../../components/ui/TempoDecorrido';
import { tvo } from '../../i18n/pt-BR/vitrine-operacoes';
import { CORES_RISCO, type Leito, type LeitoAvaliado, type LeitoDetalhado } from '../../types';
import { agora } from '../../utils/relogio';

/** Exemplos fictícios (RS-01), com instantes relativos a agora. */
const antes = (min: number) => new Date(agora().getTime() - min * 60_000).toISOString();
const depois = (min: number) => new Date(agora().getTime() + min * 60_000).toISOString();

const leito = (codigo: string, extra: Partial<LeitoDetalhado> = {}): LeitoDetalhado => ({
  id: `vitrine-${codigo}`,
  codigo,
  setorId: 'uti',
  setorNome: 'UTI',
  perfil: 'adulto',
  isolamento: false,
  status: 'livre',
  desde: antes(40),
  minutosNoStatus: 40,
  criadoEm: antes(600),
  atualizadoEm: antes(40),
  versao: 1,
  ...extra,
});

const CARTOES: LeitoDetalhado[] = [
  leito('UTI-01'),
  leito('UTI-02', {
    status: 'ocupado',
    internacaoId: 'vitrine-int',
    ocupante: {
      nome: 'Joana Freitas',
      idade: 29,
      internacaoId: 'vitrine-int',
      diaInternacao: 4,
      temAlergia: true,
      alergiasNaoInformadas: false,
      precaucao: 'contato',
      previsaoAltaVencida: true,
    },
  }),
  leito('UTI-03', {
    status: 'reservado',
    solicitacaoId: 'vitrine-sol',
    desde: antes(150),
    reservaLonga: true,
    reserva: {
      solicitacaoId: 'vitrine-sol',
      pacienteNome: 'Carlos Souza',
      prioridade: 'laranja',
      desde: antes(150),
    },
  }),
  leito('UTI-04', {
    status: 'higienizacao',
    higienizacao: { tipo: 'isolamento' },
    desde: antes(190),
    higienizacaoAtrasada: 'alerta',
  }),
  leito('UTI-05', {
    status: 'bloqueado',
    bloqueio: { motivo: 'Manutenção', previsaoLiberacao: '2026-01-01', em: antes(600), autor: '—' },
    liberacaoVencida: true,
  }),
];

const base = (codigo: string, extra: Partial<Leito> = {}): Leito => ({
  ...leito(codigo),
  ...extra,
});
const AVALIADOS: LeitoAvaliado[] = [
  { leito: base('UTI-07'), compativel: true, motivos: [], sugerido: true },
  { leito: base('UTI-11'), compativel: true, motivos: [], sugerido: false },
  {
    leito: base('UTI-27', { perfil: 'pediatrico' }),
    compativel: false,
    motivos: ['perfil'],
    sugerido: false,
  },
  {
    leito: base('ENF-104A', { setorId: 'enfermaria', quarto: '104' }),
    compativel: false,
    motivos: ['isolamento'],
    sugerido: false,
  },
  {
    leito: base('APT-212', { setorId: 'apartamento' }),
    compativel: false,
    motivos: ['setor'],
    sugerido: false,
  },
];

const SELOS: SituacaoSelo[] = ['ok', 'baixo', 'zerado', 'vencendo', 'vencido', 'bloqueado'];
const IDADES = { adulto: 40, crianca: 4, bebe: 0, semIdade: null } as const;
type ChaveIdade = keyof typeof IDADES;

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="space-y-2">
      <h3 className="text-[13.5px] font-semibold text-text-muted">{titulo}</h3>
      {children}
    </section>
  );
}

/** Seção "Módulos operacionais" da vitrine (16.11): todos os componentes e estados. */
export function VitrineOperacoes() {
  const [quantidade, setQuantidade] = useState<number | null>(6);
  const [leitoEscolhido, setLeitoEscolhido] = useState('');
  const [usarExcecao, setUsarExcecao] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [idade, setIdade] = useState<ChaveIdade>('adulto');
  const [sinais, setSinais] = useState<ValoresSinais>({
    pas: '85',
    pad: '50',
    fc: '140',
    fr: '24',
    temperatura: '39,6',
    spo2: '89',
  });
  const [ciente, setCiente] = useState(false);
  const [justAlergia, setJustAlergia] = useState('');
  const [paciente, setPaciente] = useState<OpcaoPaciente | null>(null);
  const [pacienteFiltro, setPacienteFiltro] = useState<OpcaoPaciente | null>(null);

  return (
    <Card titulo={tvo.titulo}>
      <div className="space-y-6">
        <p className="max-w-[70ch] text-[14px] text-text-muted">{tvo.descricao}</p>

        <Grupo titulo={tvo.abas}>
          <AbasModulo
            rotulo={tvo.abasRotulo}
            abas={[
              { rotulo: 'Vitrine', para: '/ui' },
              { rotulo: 'Fila', para: '/emergencia' },
              { rotulo: 'Alertas', para: '/emergencia?aba=alertas', contador: 3 },
              { rotulo: 'Histórico', para: '/emergencia/historico' },
            ]}
          />
        </Grupo>

        <Grupo titulo={tvo.resumo}>
          <ResumoNumeros
            rotulo={tvo.resumoRotulo}
            itens={[
              { rotulo: 'UTI', valor: 22, complemento: '/30 (73%)' },
              { rotulo: 'Baixo', valor: 3, para: '/farmacia?situacao=baixo' },
              { rotulo: 'Zerado', valor: 1, destaque: 'perigo' },
              { rotulo: 'Acima do prazo', valor: 0, destaque: 'perigo' },
            ]}
          />
        </Grupo>

        <Grupo titulo={tvo.tempo}>
          <dl className="grid gap-2 text-[14px] sm:grid-cols-3">
            <div>
              <dt className="text-text-muted">{tvo.tempoEspera}</dt>
              <dd>
                <TempoDecorrido desde={antes(65)} />
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">{tvo.tempoPrazo}</dt>
              <dd>
                <TempoDecorrido prazo={depois(28)} />
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">{tvo.tempoVencido}</dt>
              <dd>
                <TempoDecorrido prazo={antes(15)} />
              </dd>
            </div>
          </dl>
        </Grupo>

        <Grupo titulo={tvo.quantidade}>
          <Campo rotulo={tvo.quantidadeRotulo} className="max-w-xs">
            <CampoQuantidade
              valor={quantidade}
              aoMudar={setQuantidade}
              max={60}
              unidade="comprimidos"
            />
          </Campo>
        </Grupo>

        <Grupo titulo={tvo.linhaDoTempo}>
          <LinhaDoTempo
            itens={[
              {
                em: antes(60),
                titulo: 'Chegada',
                detalhe: 'Ambulância',
                autor: 'Usuário de demonstração',
              },
              {
                em: antes(52),
                titulo: 'Triagem',
                detalhe: 'Amarelo',
                autor: 'Usuário de demonstração',
              },
              {
                em: antes(30),
                titulo: 'Triagem',
                detalhe: 'Amarelo → Laranja',
                cor: 'bg-risco-laranja',
              },
              { em: antes(12), titulo: 'Chamado para atendimento', detalhe: 'Dr. Marcos Ribeiro' },
            ]}
          />
        </Grupo>

        <Grupo titulo={tvo.riscos}>
          <div className="space-y-2">
            {(
              [
                ['extenso', tvo.riscosExtenso],
                ['tempoAlvo', tvo.riscosTempoAlvo],
                ['curto', tvo.riscosCurto],
              ] as const
            ).map(([variante, rotulo]) => (
              <div key={variante} className="flex flex-wrap items-center gap-2">
                <span className="w-32 text-[12.5px] text-text-muted">{rotulo}</span>
                {CORES_RISCO.map((cor) => (
                  <BadgeRisco key={cor} risco={cor} variante={variante} />
                ))}
              </div>
            ))}
          </div>
        </Grupo>

        <Grupo titulo={tvo.leitos}>
          <div className="flex flex-wrap gap-2">
            {(['livre', 'ocupado', 'reservado', 'higienizacao', 'bloqueado'] as const).map((s) => (
              <BadgeLeito key={s} status={s} />
            ))}
          </div>
        </Grupo>

        <Grupo titulo={tvo.estoque}>
          <div className="flex flex-wrap gap-2">
            {SELOS.map((s) => (
              <BadgeEstoque key={s} situacao={s} />
            ))}
          </div>
        </Grupo>

        <Grupo titulo={tvo.cartoes}>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {CARTOES.map((l) => (
              <CartaoLeito key={l.id} leito={l} aoAcao={() => undefined} />
            ))}
          </div>
        </Grupo>

        <Grupo titulo={tvo.seletor}>
          <SeletorLeito
            avaliados={AVALIADOS}
            valor={leitoEscolhido}
            aoMudar={setLeitoEscolhido}
            permitirExcecao
            usarExcecao={usarExcecao}
            aoMudarUsarExcecao={setUsarExcecao}
            justificativa={justificativa}
            aoMudarJustificativa={setJustificativa}
            nome="vitrineLeito"
          />
          <p className="text-[12.5px] text-text-muted" aria-live="polite">
            {tvo.seletorEscolhido(
              AVALIADOS.find((a) => a.leito.id === leitoEscolhido)?.leito.codigo ?? '',
            )}
          </p>
        </Grupo>

        <Grupo titulo={tvo.sinais}>
          <Campo rotulo={tvo.sinaisIdade} className="max-w-xs">
            <Select
              vazia={false}
              value={idade}
              onChange={(e) => setIdade(e.target.value as ChaveIdade)}
              opcoes={(Object.keys(IDADES) as ChaveIdade[]).map((k) => ({
                valor: k,
                rotulo: tvo.sinaisIdades[k],
              }))}
            />
          </Campo>
          <CamposSinaisVitais
            valores={sinais}
            aoMudar={(campo, valor) => setSinais((s) => ({ ...s, [campo]: valor }))}
            idade={IDADES[idade]}
            mostrarPeso
            prefixo="vitrineSinais"
          />
        </Grupo>

        <Grupo titulo={tvo.alergia}>
          <div className="max-w-xl">
            <AlertaAlergia
              correspondencia={{ termo: 'penicilina', campo: 'classe', candidato: 'Penicilinas' }}
              medicamento="Amoxicilina 500 mg"
              ciente={ciente}
              aoMudarCiente={setCiente}
              justificativa={justAlergia}
              aoMudarJustificativa={setJustAlergia}
              prefixo="vitrineItem"
            />
          </div>
        </Grupo>

        <Grupo titulo={tvo.paciente}>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo rotulo={tvo.pacienteRotulo}>
              <ComboboxPaciente valor={paciente} aoMudar={setPaciente} mostrarSituacao />
            </Campo>
            <Campo rotulo={tvo.pacienteFiltro}>
              <ComboboxPaciente
                valor={pacienteFiltro}
                aoMudar={setPacienteFiltro}
                filtro="internados_ou_em_atendimento"
              />
            </Campo>
          </div>
        </Grupo>
      </div>
    </Card>
  );
}
