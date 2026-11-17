/**
 * Fase 27 (BL-01.7) — Modo API do navegador: transporte HTTP, recarga das telas (D26), páginas
 * juntadas, E-22 e o aviso único. As telas em si são as mesmas (o `vite.config.ts` troca os
 * serviços no build); aqui se confere que a troca não esquece nenhuma função.
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErroRede } from '@medicore/dominio/erros';
import { t } from '@medicore/dominio/i18n/pt-BR';
import { NOMES_OPERACOES } from '../services/nomes-colecoes-operacoes';
import { ErrorState } from '../components/ui/EmptyState';
import { AvisoServidor } from '../components/layout/AvisoServidor';
import { CHAVE_AVISO_SERVIDOR } from '../components/layout/aviso-servidor';
import { ToastProvider } from '../components/ui/feedback/ToastProvider';
import { useToast } from '../hooks/useToast';
import {
  baseDaApi,
  criarTransporte,
  haGravacaoParaRepetir,
  repetirUltimaGravacao,
  TEMPO_LIMITE_MS,
} from '../services/api/rede';
import { assinar, INTERVALO_RECARGA_MS, notificarGravacao } from '../services/api/repositorio';
import { emPaginas } from '../services/api/paginas';
import { SERVICOS_DO_MODO_API } from '../services/api/trocas';

const resposta = (status: number, corpo?: unknown, texto?: string) =>
  new Response(texto ?? (corpo === undefined ? '' : JSON.stringify(corpo)), { status });

describe('transporte HTTP', () => {
  it('monta a URL, a query sem vazios, o corpo e o If-Match; sem cache', async () => {
    const buscar = vi.fn(async () => resposta(200, { ok: true }));
    const enviar = criarTransporte(baseDaApi('https://api.exemplo/'), buscar);
    await enviar({
      metodo: 'POST',
      caminho: '/leitos/l-1/bloquear',
      consulta: { a: 1, b: '', c: undefined },
      corpo: { motivo: 'x' },
      versao: 3,
    });
    const [url, init] = buscar.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.exemplo/api/v1/leitos/l-1/bloquear?a=1');
    expect(init).toMatchObject({
      method: 'POST',
      body: '{"motivo":"x"}',
      cache: 'no-store',
      credentials: 'include',
      headers: { 'If-Match': '"v3"', 'Content-Type': 'application/json' },
    });
  });

  it('sem rede, tempo esgotado ou página de erro do proxy: o contrato vira ErroRede', async () => {
    const semRede = criarTransporte('x', async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await semRede({ metodo: 'GET', caminho: '/leitos' })).toEqual({
      status: 0,
      corpo: null,
    });
    const proxy = criarTransporte('x', async () => resposta(502, undefined, '<html>Bad gateway'));
    expect(await proxy({ metodo: 'GET', caminho: '/leitos' })).toEqual({
      status: 502,
      corpo: null,
    });

    vi.useFakeTimers();
    const lento = criarTransporte(
      'x',
      (_u, init) =>
        new Promise((_r, rejeitar) =>
          init!.signal!.addEventListener('abort', () => rejeitar(new Error('abortado'))),
        ),
    );
    const promessa = lento({ metodo: 'GET', caminho: '/leitos' });
    await vi.advanceTimersByTimeAsync(TEMPO_LIMITE_MS);
    expect((await promessa).status).toBe(0);
    vi.useRealTimers();
  });

  it('gravação aceita avisa as telas; a que falhou por rede pode ser reenviada', async () => {
    const ouvinte = vi.fn();
    const sair = assinar(ouvinte);
    let chamadas = 0;
    const enviar = criarTransporte('x', async () => {
      chamadas++;
      if (chamadas === 1) throw new TypeError('offline');
      return resposta(200, { versao: 2 });
    });
    await enviar({ metodo: 'POST', caminho: '/leitos/l/desbloquear', versao: 1 });
    expect(haGravacaoParaRepetir()).toBe(true);
    expect(ouvinte).not.toHaveBeenCalled();
    await enviar({ metodo: 'GET', caminho: '/leitos' }); // leitura não mexe na gravação pendente
    expect(haGravacaoParaRepetir()).toBe(true);
    const r = await repetirUltimaGravacao();
    expect(r?.status).toBe(200);
    expect(haGravacaoParaRepetir()).toBe(false);
    expect(await repetirUltimaGravacao()).toBeNull();
    sair();
  });
});

describe('recarga das telas (D26)', () => {
  afterEach(() => vi.useRealTimers());

  it('gravação própria recarrega tudo; a cada 30 s, só as telas operacionais (aba visível)', () => {
    vi.useFakeTimers();
    const avisos: string[][] = [];
    const sair = assinar((c) => avisos.push([...c]));
    notificarGravacao();
    expect(avisos[0]).toEqual(expect.arrayContaining(['pacientes', 'consultas', 'leitos']));
    vi.advanceTimersByTime(INTERVALO_RECARGA_MS);
    expect(avisos[1]).toEqual(Object.values(NOMES_OPERACOES));
    expect(avisos[1]).not.toContain('pacientes');

    const visibilidade = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    vi.advanceTimersByTime(INTERVALO_RECARGA_MS);
    expect(avisos).toHaveLength(2);
    visibilidade.mockRestore();

    sair();
    vi.advanceTimersByTime(INTERVALO_RECARGA_MS * 2);
    expect(avisos).toHaveLength(2); // sem ninguém ouvindo, o relógio para
  });
});

describe('listas com mais de 100 por página (R-API2)', () => {
  const dados = Array.from({ length: 230 }, (_, i) => i);
  const listar = vi.fn(async (f: { pagina?: number; porPagina?: number }) => {
    const p = f.pagina ?? 1;
    const n = f.porPagina ?? 10;
    return { itens: dados.slice((p - 1) * n, p * n), total: dados.length, pagina: p, porPagina: n };
  });

  it('até 100, uma chamada; acima, junta as páginas e corta como o navegador', async () => {
    await emPaginas(listar)({ porPagina: 50 });
    expect(listar).toHaveBeenCalledTimes(1);
    listar.mockClear();
    const todos = await emPaginas(listar)({ porPagina: 500 });
    expect(listar).toHaveBeenCalledTimes(3);
    expect(todos).toMatchObject({ total: 230, pagina: 1, porPagina: 500 });
    expect(todos.itens).toHaveLength(230);
    const segunda = await emPaginas(listar)({ porPagina: 200, pagina: 2 });
    expect(segunda.itens).toEqual(dados.slice(200));
    const alem = await emPaginas(listar)({ porPagina: 200, pagina: 9 });
    expect(alem.pagina).toBe(2); // página além da última mostra a última
  });
});

describe('a troca dos serviços não esquece nenhuma função', () => {
  // O código das telas, dos componentes e dos ganchos (sem os serviços e os testes).
  const fontes = Object.entries(
    import.meta.glob(['../**/*.{ts,tsx}', '!../services/**', '!../__tests__/**'], {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  ).map(([, fonte]) => fonte);

  it('lê o código das telas', () => expect(fontes.length).toBeGreaterThan(100));

  it.each(SERVICOS_DO_MODO_API)('%s: o que as telas importam existe no modo API', async (nome) => {
    const usados = new Set<string>();
    for (const fonte of fontes) {
      const padrao = new RegExp(`import \\{([^}]*)\\} from '[./]*services/${nome}'`, 'g');
      for (const m of fonte.matchAll(padrao)) {
        for (const n of m[1]!.split(',')) {
          const limpo = n.trim().split(' as ')[0]!;
          if (limpo && !limpo.startsWith('type ')) usados.add(limpo);
        }
      }
      if (fonte.includes(`services/${nome}')`)) {
        for (const m of fonte.matchAll(/\bm\.([a-zA-Z]+)\(/g)) usados.add(m[1]!);
      }
    }
    const modulo = (await import(`../services/api/${nome}.ts`)) as Record<string, unknown>;
    const local = (await import(`../services/${nome}.ts`)) as Record<string, unknown>;
    if (['pacientes', 'leitos', 'farmacia'].includes(nome)) expect(usados.size).toBeGreaterThan(5);
    for (const n of usados) {
      if (!(n in local)) continue; // `m.` de outro módulo carregado sob demanda
      expect(modulo, `${nome}.${n}`).toHaveProperty(n);
    }
  });
});

describe('E-22 na tela', () => {
  it('erro ao carregar sem conexão tem mensagem própria', () => {
    render(<ErrorState erro={new ErroRede()} aoTentarNovamente={() => {}} />);
    expect(screen.getByText(t.erro.carregarSemConexao)).toBeInTheDocument();
  });

  it('no modo API, o aviso de gravação sem conexão oferece "Tentar de novo"', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api');
    function Botao() {
      const toast = useToast();
      return <button onClick={() => toast.erro(t.erros.rede)}>falhar</button>;
    }
    render(
      <ToastProvider>
        <Botao />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'falhar' }));
    expect(screen.getByRole('button', { name: t.erro.tentarDeNovo })).toBeInTheDocument();
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: t.erro.tentarDeNovo }));
    });
    vi.unstubAllEnvs();
  });
});

describe('aviso único "Os dados de exemplo agora ficam no servidor" (27.2.3, D27)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('só no modo API; "Entendi" apaga os dados antigos do navegador e não volta mais', async () => {
    const { unmount } = render(<AvisoServidor />);
    expect(screen.queryByText(t.demo.servidorTitulo)).toBeNull();
    unmount();

    vi.stubEnv('VITE_API_URL', 'http://api');
    localStorage.setItem('medicore:pacientes:v1', '[]');
    localStorage.setItem('medicore-tema', 'escuro');
    const segundo = render(<AvisoServidor />);
    expect(screen.getByRole('heading', { name: t.demo.servidorTitulo })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t.demo.servidorEntendi }));
    expect(screen.queryByText(t.demo.servidorTitulo)).toBeNull();
    expect(localStorage.getItem('medicore:pacientes:v1')).toBeNull();
    expect(localStorage.getItem('medicore-tema')).toBe('escuro');
    expect(localStorage.getItem(CHAVE_AVISO_SERVIDOR)).toBe('visto');
    segundo.unmount();
    render(<AvisoServidor />);
    expect(screen.queryByText(t.demo.servidorTitulo)).toBeNull();
  });
});
