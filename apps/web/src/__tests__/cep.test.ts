import { buscarCep, ErroBuscaCep, limparCacheCep, TEMPO_LIMITE_CEP_MS } from '../services/cep';

const resposta = (corpo: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(corpo), { status }));

const PAULISTA = {
  cep: '01310-100',
  logradouro: 'Avenida Paulista',
  bairro: 'Bela Vista',
  localidade: 'São Paulo',
  uf: 'SP',
};

beforeEach(() => limparCacheCep());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('buscarCep (A6)', () => {
  it('converte a resposta do ViaCEP e guarda em cache', async () => {
    const fetchSimulado = vi.fn(() => resposta(PAULISTA));
    vi.stubGlobal('fetch', fetchSimulado);
    const esperado = {
      logradouro: 'Avenida Paulista',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      uf: 'SP',
    };
    expect(await buscarCep('01310-100')).toEqual(esperado);
    expect(fetchSimulado).toHaveBeenCalledWith(
      'https://viacep.com.br/ws/01310100/json/',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(await buscarCep('01310100')).toEqual(esperado);
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
  });

  it('{ erro: true } e 400 → não encontrado (null)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => resposta({ erro: true })),
    );
    expect(await buscarCep('99999999')).toBeNull();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => resposta({}, 400)),
    );
    expect(await buscarCep('99999998')).toBeNull();
  });

  it('CEP incompleto nem busca', async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal('fetch', fetchSimulado);
    expect(await buscarCep('0131')).toBeNull();
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it('falha de rede e erro 500 → ErroBuscaCep (E-10), sem cache', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    await expect(buscarCep('01310100')).rejects.toBeInstanceOf(ErroBuscaCep);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => resposta({}, 500)),
    );
    await expect(buscarCep('01310100')).rejects.toBeInstanceOf(ErroBuscaCep);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => resposta(PAULISTA)),
    );
    await expect(buscarCep('01310100')).resolves.toMatchObject({ uf: 'SP' });
  });

  it('tempo esgotado em 5 s → ErroBuscaCep', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, { signal }: { signal: AbortSignal }) =>
          new Promise((_, rejeitar) =>
            signal.addEventListener('abort', () =>
              rejeitar(new DOMException('abort', 'AbortError')),
            ),
          ),
      ),
    );
    const busca = buscarCep('01310100');
    vi.advanceTimersByTime(TEMPO_LIMITE_CEP_MS + 1);
    await expect(busca).rejects.toBeInstanceOf(ErroBuscaCep);
  });

  it('cancelada por quem chamou: repassa o cancelamento (não é falha)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, { signal }: { signal: AbortSignal }) =>
          new Promise((_, rejeitar) =>
            signal.addEventListener('abort', () =>
              rejeitar(new DOMException('abort', 'AbortError')),
            ),
          ),
      ),
    );
    const controle = new AbortController();
    const busca = buscarCep('01310100', controle.signal);
    controle.abort();
    await expect(busca).rejects.not.toBeInstanceOf(ErroBuscaCep);
  });
});
