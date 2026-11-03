/**
 * Fase 16 — componentes compartilhados dos módulos operacionais.
 * 16.2.3 AbasModulo e ResumoNumeros · 16.3.3 TempoDecorrido e CampoQuantidade ·
 * 16.4 LinhaDoTempo · 16.6.4 selos · 16.7.5 CartaoLeito · 16.8.4 SeletorLeito ·
 * 16.9.3 CamposSinaisVitais · 16.10.2 AlertaAlergia.
 */
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AlertaAlergia } from '../components/farmacia/AlertaAlergia';
import { BadgeEstoque, type SituacaoSelo } from '../components/farmacia/BadgeEstoque';
import { BadgeRisco } from '../components/emergencia/BadgeRisco';
import { CamposSinaisVitais } from '../components/emergencia/CamposSinaisVitais';
import type { ValoresSinais } from '../components/emergencia/sinais';
import { acoesDoLeito, ehExcecao } from '../components/leitos/acoes-leito';
import { BadgeLeito } from '../components/leitos/BadgeLeito';
import { CartaoLeito } from '../components/leitos/CartaoLeito';
import { SeletorLeito } from '../components/leitos/SeletorLeito';
import { AbasModulo } from '../components/ui/AbasModulo';
import { abaAtiva } from '../components/ui/abas';
import { Campo } from '../components/ui/form/Campo';
import { CampoQuantidade } from '../components/ui/form/CampoQuantidade';
import { LinhaDoTempo } from '../components/ui/LinhaDoTempo';
import { ResumoNumeros } from '../components/ui/ResumoNumeros';
import { TempoDecorrido } from '../components/ui/TempoDecorrido';
import type { CorRisco, Leito, LeitoAvaliado, LeitoDetalhado, StatusLeito } from '../types';
import { CORES_RISCO } from '../types';

const AGORA = '2026-11-10T13:00:00.000Z'; // 10:00 em Brasília

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date(AGORA));
});
afterEach(() => vi.useRealTimers());

const comRota = (ui: React.ReactNode, rota = '/') => (
  <MemoryRouter initialEntries={[rota]}>{ui}</MemoryRouter>
);
const minutosAtras = (min: number) => new Date(Date.parse(AGORA) - min * 60_000).toISOString();

const leito = (extra: Partial<LeitoDetalhado> = {}): LeitoDetalhado => ({
  id: 'l1',
  codigo: 'UTI-03',
  setorId: 'uti',
  setorNome: 'UTI',
  perfil: 'adulto',
  isolamento: false,
  status: 'livre',
  desde: minutosAtras(40),
  minutosNoStatus: 40,
  criadoEm: AGORA,
  atualizadoEm: AGORA,
  versao: 1,
  ...extra,
});

describe('AbasModulo (16.2)', () => {
  const abas = [
    { rotulo: 'Fila', para: '/emergencia' },
    { rotulo: 'Alertas', para: '/emergencia?aba=alertas', contador: 3 },
    { rotulo: 'Histórico', para: '/emergencia/historico' },
  ];

  it('marca com aria-current a aba da URL atual (inclusive pela query)', () => {
    render(
      comRota(<AbasModulo rotulo="Seções da Emergência" abas={abas} />, '/emergencia?aba=alertas'),
    );
    const nav = screen.getByRole('navigation', { name: 'Seções da Emergência' });
    expect(within(nav).getByRole('link', { name: /Alertas/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Fila' })).not.toHaveAttribute('aria-current');
  });

  it('caminho mais longo vence; subpáginas ativam a aba de origem', () => {
    const leitos = [
      { rotulo: 'Mapa', para: '/leitos' },
      { rotulo: 'Internações', para: '/leitos/internacoes' },
    ];
    expect(abaAtiva(leitos, '/leitos', '')).toBe(0);
    expect(abaAtiva(leitos, '/leitos/internacoes/42', '')).toBe(1);
    expect(abaAtiva(abas, '/emergencia', '')).toBe(0);
    expect(abaAtiva(abas, '/emergencia/historico', '?de=2026-11-01')).toBe(2);
    expect(abaAtiva(abas, '/farmacia', '')).toBe(-1);
  });
});

describe('ResumoNumeros (16.2)', () => {
  it('lista os números com rótulo; com `para`, cada item é um link para o filtro', () => {
    render(
      comRota(
        <ResumoNumeros
          rotulo="Resumo do estoque"
          itens={[
            { rotulo: 'Baixo', valor: 3, para: '/farmacia?situacao=baixo' },
            { rotulo: 'Zerado', valor: 1, destaque: 'perigo' },
            { rotulo: 'UTI', valor: 22, complemento: '/30 (73%)' },
          ]}
        />,
      ),
    );
    const lista = screen.getByRole('list', { name: 'Resumo do estoque' });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(3);
    expect(within(lista).getByRole('link', { name: /Baixo\s*3/ })).toHaveAttribute(
      'href',
      '/farmacia?situacao=baixo',
    );
    expect(within(lista).getByText('1')).toHaveClass('text-danger');
    expect(within(lista).getByText('/30 (73%)')).toBeInTheDocument();
  });
});

describe('TempoDecorrido (16.3)', () => {
  it('muda o texto a cada tique, sem região aria-live', () => {
    render(<TempoDecorrido desde={minutosAtras(12)} />);
    const tempo = screen.getByText('há 12 min');
    expect(tempo.tagName).toBe('TIME');
    expect(tempo.closest('[aria-live]')).toBeNull();
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText('há 13 min')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(53 * 60_000));
    expect(screen.getByText('há 1 h 06 min')).toBeInTheDocument();
  });

  it('prazo: "até 10:28"; depois do prazo, destaca o excesso', () => {
    const prazo = new Date(Date.parse(AGORA) + 28 * 60_000).toISOString();
    render(<TempoDecorrido prazo={prazo} />);
    const tempo = screen.getByText('até 10:28');
    expect(tempo).not.toHaveClass('text-danger');
    act(() => vi.advanceTimersByTime(43 * 60_000));
    const passou = screen.getByLabelText('até 10:28, passou 15 min');
    expect(passou).toHaveClass('text-danger');
    expect(passou).toHaveTextContent('+15 min');
  });
});

describe('CampoQuantidade (16.3)', () => {
  function Teste({ max }: { max?: number }) {
    const [n, setN] = useState<number | null>(2);
    return (
      <Campo rotulo="Quantidade (comprimidos)">
        <CampoQuantidade valor={n} aoMudar={setN} min={1} max={max} unidade="comprimidos" />
      </Campo>
    );
  }

  it('botões − e + com nome acessível e limites', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<Teste max={3} />);
    const campo = screen.getByLabelText('Quantidade (comprimidos)');
    await user.click(screen.getByRole('button', { name: 'Aumentar quantidade' }));
    expect(campo).toHaveValue(3);
    expect(screen.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Diminuir quantidade' }));
    await user.click(screen.getByRole('button', { name: 'Diminuir quantidade' }));
    expect(campo).toHaveValue(1);
    expect(screen.getByRole('button', { name: 'Diminuir quantidade' })).toBeDisabled();
  });

  it('por teclado: digitar troca o valor; decimais viram inteiros; vazio é nulo', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<Teste />);
    const campo = screen.getByLabelText('Quantidade (comprimidos)');
    await user.clear(campo);
    expect(campo).toHaveValue(null);
    await user.type(campo, '14');
    expect(campo).toHaveValue(14);
    await user.clear(campo);
    await user.type(campo, '5.7');
    expect(campo).toHaveValue(5);
  });
});

describe('LinhaDoTempo (16.4)', () => {
  it('mostra título, detalhe, data e autor de cada item, na ordem', () => {
    render(
      <LinhaDoTempo
        itens={[
          { em: minutosAtras(60), titulo: 'Chegada', autor: 'Usuário de demonstração' },
          { em: minutosAtras(30), titulo: 'Triagem', detalhe: 'Amarelo → Laranja' },
        ]}
      />,
    );
    const itens = screen.getAllByRole('listitem');
    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveTextContent('Chegada');
    expect(itens[0]).toHaveTextContent('Usuário de demonstração');
    expect(itens[1]).toHaveTextContent('Amarelo → Laranja');
    expect(within(itens[1]).getByText(/10\/11\/2026/).tagName).toBe('TIME');
  });
});

describe('selos (16.6): sempre com texto visível, não só cor', () => {
  it('BadgeRisco: nome, significado e tempo-alvo', () => {
    const { rerender } = render(<BadgeRisco risco="laranja" />);
    expect(screen.getByText('Laranja — muito urgente')).toBeInTheDocument();
    rerender(<BadgeRisco risco="laranja" variante="tempoAlvo" />);
    expect(screen.getByText('Laranja — até 10 min')).toBeInTheDocument();
    rerender(<BadgeRisco risco="vermelho" variante="tempoAlvo" />);
    expect(screen.getByText('Vermelho — imediato')).toBeInTheDocument();
    rerender(<BadgeRisco risco="azul" variante="curto" />);
    expect(screen.getByText('Azul')).toBeInTheDocument();
  });

  it('cada cor de risco tem texto próprio e classes do token', () => {
    for (const cor of CORES_RISCO as readonly CorRisco[]) {
      const { container, unmount } = render(<BadgeRisco risco={cor} variante="curto" />);
      expect(container.textContent?.trim().length).toBeGreaterThan(0);
      expect(container.firstElementChild).toHaveClass(`bg-risco-${cor}`, `text-on-risco-${cor}`);
      unmount();
    }
  });

  it('BadgeLeito e BadgeEstoque', () => {
    const status: StatusLeito[] = ['livre', 'ocupado', 'reservado', 'higienizacao', 'bloqueado'];
    const textos = ['Livre', 'Ocupado', 'Reservado', 'Em higienização', 'Bloqueado'];
    status.forEach((s, i) => {
      const { unmount } = render(<BadgeLeito status={s} />);
      expect(screen.getByText(textos[i])).toBeInTheDocument();
      unmount();
    });
    const selos: SituacaoSelo[] = ['ok', 'baixo', 'zerado', 'vencendo', 'vencido', 'bloqueado'];
    const nomes = ['OK', 'Baixo', 'Zerado', 'Vencendo', 'Vencido', 'Bloqueado'];
    selos.forEach((s, i) => {
      const { unmount } = render(<BadgeEstoque situacao={s} />);
      expect(screen.getByText(nomes[i])).toBeInTheDocument();
      unmount();
    });
  });
});

describe('CartaoLeito (16.7)', () => {
  it('higienização: nome acessível completo e botão "Concluir" com nome próprio', async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(AGORA));
    const aoAcao = vi.fn();
    const l = leito({ status: 'higienizacao', higienizacao: { tipo: 'terminal' } });
    render(comRota(<CartaoLeito leito={l} aoAcao={aoAcao} />));
    expect(
      screen.getByRole('link', { name: 'UTI-03, Em higienização, há 40 min' }),
    ).toHaveAttribute('href', '/leitos/l1');
    const concluir = screen.getByRole('button', { name: 'Concluir higienização do leito UTI-03' });
    concluir.click();
    expect(aoAcao).toHaveBeenCalledWith('concluir', l);
  });

  it('ocupado: paciente, dia de internação, alergia e alta prevista vencida', () => {
    const l = leito({
      status: 'ocupado',
      internacaoId: 'i1',
      ocupante: {
        nome: 'Joana Freitas',
        idade: 29,
        internacaoId: 'i1',
        diaInternacao: 4,
        temAlergia: true,
        alergiasNaoInformadas: false,
        precaucao: 'contato',
        previsaoAltaVencida: true,
      },
    });
    render(comRota(<CartaoLeito leito={l} aoAcao={() => {}} />));
    expect(
      screen.getByRole('link', {
        name: 'UTI-03, Ocupado, Joana Freitas, 29 anos, Dia 4 de internação, com alergia registrada, Alta prevista vencida',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Contato')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mais ações para UTI-03/ })).toBeInTheDocument();
  });

  it('livre: "Internar" leva ao formulário com o leito; sem `aoAcao`, só o link', () => {
    const { unmount } = render(comRota(<CartaoLeito leito={leito()} aoAcao={() => {}} />));
    expect(screen.getByRole('link', { name: 'Internar no leito UTI-03' })).toHaveAttribute(
      'href',
      '/leitos/internar?leitoId=l1',
    );
    unmount();
    render(comRota(<CartaoLeito leito={leito()} />));
    expect(screen.queryByRole('link', { name: /Internar/ })).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('destaques de tempo: higienização atrasada, reserva longa, liberação vencida', () => {
    render(
      comRota(
        <>
          <CartaoLeito leito={leito({ status: 'higienizacao', higienizacaoAtrasada: 'alerta' })} />
          <CartaoLeito
            leito={leito({
              id: 'l2',
              codigo: 'UTI-04',
              status: 'reservado',
              solicitacaoId: 's1',
              reservaLonga: true,
              reserva: {
                solicitacaoId: 's1',
                pacienteNome: 'Carlos Souza',
                prioridade: 'laranja',
                desde: AGORA,
              },
            })}
          />
          <CartaoLeito
            leito={leito({
              id: 'l3',
              codigo: 'UTI-05',
              status: 'bloqueado',
              liberacaoVencida: true,
              bloqueio: { motivo: 'Manutenção', em: AGORA, autor: 'x' },
            })}
          />
        </>,
      ),
    );
    expect(screen.getByRole('link', { name: /UTI-03.*Higienização atrasada/ })).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: /UTI-04.*Reservado para Carlos Souza.*Reserva há mais de 2 h/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /UTI-05.*Manutenção.*Liberação prevista vencida/ }),
    ).toBeInTheDocument();
  });

  it('matriz de ações por situação', () => {
    expect(acoesDoLeito(leito())).toEqual(['internar', 'bloquear']);
    expect(acoesDoLeito(leito({ setorId: 'observacao' }))).toEqual(['bloquear']);
    expect(acoesDoLeito(leito({ status: 'reservado' }))).toEqual(['internar', 'cancelarReserva']);
    expect(acoesDoLeito(leito({ status: 'ocupado', internacaoId: 'i' }))).toEqual([
      'transferir',
      'darAlta',
    ]);
    expect(acoesDoLeito(leito({ status: 'ocupado', atendimentoId: 'a' }))).toEqual([]);
    expect(acoesDoLeito(leito({ status: 'higienizacao' }))).toEqual(['concluir', 'bloquear']);
    expect(acoesDoLeito(leito({ status: 'bloqueado' }))).toEqual(['desbloquear']);
  });
});

describe('SeletorLeito (16.8)', () => {
  const base = (codigo: string, extra: Partial<Leito> = {}): Leito => ({
    ...leito({ id: codigo, codigo }),
    ...extra,
  });
  const AVALIADOS: LeitoAvaliado[] = [
    { leito: base('UTI-02'), compativel: true, motivos: [], sugerido: true },
    { leito: base('UTI-05'), compativel: true, motivos: [], sugerido: false },
    {
      leito: base('UTI-09', { perfil: 'pediatrico' }),
      compativel: false,
      motivos: ['perfil'],
      sugerido: false,
    },
    {
      leito: base('UTI-01', { status: 'ocupado' }),
      compativel: false,
      motivos: ['situacao'],
      sugerido: false,
    },
    {
      leito: base('ENF-101A', { setorId: 'enfermaria' }),
      compativel: false,
      motivos: ['setor'],
      sugerido: false,
    },
  ];

  function Teste({ avaliados = AVALIADOS }: { avaliados?: LeitoAvaliado[] }) {
    const [valor, setValor] = useState('');
    const [usar, setUsar] = useState(false);
    const [just, setJust] = useState('');
    return (
      <>
        <SeletorLeito
          avaliados={avaliados}
          valor={valor}
          aoMudar={setValor}
          permitirExcecao
          usarExcecao={usar}
          aoMudarUsarExcecao={setUsar}
          justificativa={just}
          aoMudarJustificativa={setJust}
          semCompativel={{ rotulo: 'Pedir leito (eletiva)', aoClicar: () => {} }}
        />
        <output data-testid="valor">{valor}</output>
      </>
    );
  }

  it('só com teclado: setas, Home/End e Espaço; o sugerido vem primeiro e com foco', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<Teste />);
    const grupo = screen.getByRole('radiogroup', { name: /Leito/ });
    expect(within(grupo).queryByRole('radio', { name: /UTI-01/ })).toBeNull(); // ocupado fica de fora
    const radios = within(grupo).getAllByRole('radio');
    expect(radios[0]).toHaveAccessibleName('UTI-02, UTI, Sugerido');
    await user.tab();
    await user.tab(); // a caixa "Usar mesmo assim" vem antes
    expect(radios[0]).toHaveFocus();
    await user.keyboard('{ArrowRight} ');
    expect(screen.getByTestId('valor')).toHaveTextContent('UTI-05');
    await user.keyboard('{End}');
    expect(screen.getByRole('radio', { name: /ENF-101A/ })).toHaveFocus();
    await user.keyboard(' ');
    expect(screen.getByTestId('valor')).toHaveTextContent('UTI-05'); // incompatível não escolhe
    await user.keyboard('{Home}');
    expect(radios[0]).toHaveFocus();
  });

  it('motivo de incompatibilidade anunciado; exceção exige "Usar mesmo assim" e justificativa', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<Teste />);
    const ped = screen.getByRole('radio', {
      name: 'UTI-09, UTI, Perfil do leito diferente da idade do paciente',
    });
    expect(ped).toHaveAttribute('aria-disabled', 'true');
    await user.click(ped);
    expect(screen.getByTestId('valor')).toHaveTextContent('');
    await user.click(screen.getByRole('checkbox', { name: /Usar mesmo assim/ }));
    const excecao = screen.getByRole('radio', { name: /UTI-09, UTI, Exceção/ });
    expect(excecao).not.toHaveAttribute('aria-disabled');
    await user.click(excecao);
    expect(screen.getByTestId('valor')).toHaveTextContent('UTI-09');
    expect(screen.getByRole('textbox', { name: /Justificativa da exceção/ })).toBeRequired();
    // Fora do setor desejado não é exceção: continua indisponível.
    expect(screen.getByRole('radio', { name: /ENF-101A/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('sem leito compatível: mensagem e ação configurável', () => {
    vi.useRealTimers();
    render(<Teste avaliados={AVALIADOS.slice(2)} />);
    expect(screen.getByText('Nenhum leito livre compatível com o paciente.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pedir leito (eletiva)' })).toBeInTheDocument();
  });

  it('ehExcecao: só perfil e isolamento', () => {
    expect(ehExcecao(AVALIADOS[2])).toBe(true);
    expect(ehExcecao(AVALIADOS[3])).toBe(false);
    expect(ehExcecao(AVALIADOS[4])).toBe(false);
    expect(ehExcecao({ ...AVALIADOS[2], motivos: ['perfil', 'isolamento'] })).toBe(true);
  });
});

describe('CamposSinaisVitais (16.9)', () => {
  function Teste({ idade, inicial = {} }: { idade: number | null; inicial?: ValoresSinais }) {
    const [valores, setValores] = useState<ValoresSinais>(inicial);
    return (
      <CamposSinaisVitais
        valores={valores}
        aoMudar={(c, v) => setValores((x) => ({ ...x, [c]: v }))}
        idade={idade}
        mostrarPeso
      />
    );
  }

  it('rótulo com unidade e faixa válida na dica; fora da faixa é erro', () => {
    render(<Teste idade={40} inicial={{ spo2: '101' }} />);
    const spo2 = screen.getByLabelText('Saturação de O₂ (%)');
    expect(spo2).toHaveAccessibleDescription(/Faixa válida: 50 a 100 %/);
    expect(spo2).toHaveAttribute('aria-invalid', 'true');
    expect(spo2).toHaveAccessibleDescription(/Valor fora da faixa possível \(50 a 100 %\)/);
    expect(screen.getByLabelText('Peso (kg), opcional')).toBeInTheDocument();
  });

  it('na faixa de alerta: texto "Atenção" ligado ao campo, sem ser erro', () => {
    render(<Teste idade={40} inicial={{ spo2: '88', temperatura: '39,6' }} />);
    const spo2 = screen.getByLabelText('Saturação de O₂ (%)');
    expect(spo2).not.toHaveAttribute('aria-invalid');
    expect(spo2).toHaveAccessibleDescription(/Atenção: abaixo de 90%/);
    expect(screen.getByLabelText('Temperatura (°C)')).toHaveAccessibleDescription(
      /Atenção: 39,5 °C ou mais/,
    );
  });

  it('muda com a idade: FC 140 é alerta no adulto e normal no bebê', () => {
    const { unmount } = render(<Teste idade={40} inicial={{ fc: '140' }} />);
    expect(screen.getByLabelText('Frequência cardíaca (bpm)')).toHaveAccessibleDescription(
      /Atenção: acima de 130 bpm/,
    );
    unmount();
    render(<Teste idade={0} inicial={{ fc: '140' }} />);
    expect(screen.getByLabelText('Frequência cardíaca (bpm)')).not.toHaveAccessibleDescription(
      /Atenção/,
    );
  });

  it('sem idade: usa a faixa de adulto e avisa; texto não numérico é erro', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<Teste idade={null} />);
    await user.type(screen.getByLabelText('Frequência respiratória (irpm)'), 'abc');
    expect(screen.getByLabelText('Frequência respiratória (irpm)')).toHaveAccessibleDescription(
      /Informe um número/,
    );
    await user.type(screen.getByLabelText('Frequência cardíaca (bpm)'), '80');
    expect(screen.getByText(/Sem idade informada: usando a faixa de adulto/)).toBeInTheDocument();
  });
});

describe('AlertaAlergia (16.10)', () => {
  function Teste({ erro }: { erro?: string }) {
    const [ciente, setCiente] = useState(false);
    const [just, setJust] = useState('');
    return (
      <AlertaAlergia
        correspondencia={{ termo: 'penicilina', campo: 'classe', candidato: 'Penicilinas' }}
        medicamento="Amoxicilina 500 mg"
        ciente={ciente}
        aoMudarCiente={setCiente}
        justificativa={just}
        aoMudarJustificativa={setJust}
        erroJustificativa={erro}
        prefixo="itens.0"
      />
    );
  }

  it('anuncia uma vez (role="alert" com texto fixo) e não inclui os campos na região', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<Teste />);
    const alerta = screen.getByRole('alert');
    expect(alerta).toHaveTextContent('Possível alergia: penicilina');
    expect(alerta).toHaveTextContent('corresponde à classe de Amoxicilina 500 mg');
    expect(alerta).toHaveTextContent('Verificação por texto; confira sempre a prescrição.');
    const texto = alerta.textContent;
    const ciente = screen.getByRole('checkbox', { name: 'Ciente: dispensar mesmo assim' });
    expect(within(alerta).queryByRole('checkbox')).toBeNull();
    await user.click(ciente);
    await user.type(
      screen.getByRole('textbox', { name: /Justificativa/ }),
      'Teste alérgico negativo',
    );
    expect(screen.getByRole('alert').textContent).toBe(texto);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('justificativa obrigatória quando marcado "Ciente"', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<Teste erro="Informe a justificativa" />);
    expect(screen.queryByRole('textbox')).toBeNull();
    await user.click(screen.getByRole('checkbox'));
    const campo = screen.getByRole('textbox', { name: /Justificativa/ });
    expect(campo).toBeRequired();
    expect(campo).toHaveAccessibleDescription(/Informe a justificativa/);
  });
});
