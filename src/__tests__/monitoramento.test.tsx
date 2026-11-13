import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _reiniciarMonitoramentoParaTestes,
  capturarErro,
  deveCapturar,
  iniciarMonitoramento,
  monitoramentoAtivo,
} from '../monitoramento';
import {
  ErroArmazenamento,
  ErroConcorrencia,
  ErroConflito,
  ErroNaoEncontrado,
  ErroValidacao,
} from '../services/erros';
import { renderizarComRotas } from './utils/renderizarComRotas';

const sdk = vi.hoisted(() => ({
  iniciar: vi.fn(),
  capturar: vi.fn(() => '0123456789abcdef0123456789abcdef'),
}));
vi.mock('../monitoramento/sentry', () => sdk);

function Explode(): never {
  throw new Error('falha de teste');
}

beforeEach(() => {
  _reiniciarMonitoramentoParaTestes();
  sdk.iniciar.mockClear();
  sdk.capturar.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('deveCapturar', () => {
  it('erros esperados não vão para o monitoramento', () => {
    expect(deveCapturar(new ErroValidacao({ nome: 'Obrigatório' }))).toBe(false);
    expect(deveCapturar(new ErroConflito('cpf_duplicado', 'CPF já cadastrado'))).toBe(false);
    expect(deveCapturar(new ErroConcorrencia())).toBe(false);
    expect(deveCapturar(new ErroNaoEncontrado('Paciente não encontrado'))).toBe(false);
    expect(deveCapturar(null)).toBe(false);
  });

  it('falhas do sistema vão', () => {
    expect(deveCapturar(new TypeError('x is undefined'))).toBe(true);
    expect(deveCapturar(new ErroArmazenamento())).toBe(true);
    expect(deveCapturar('texto solto')).toBe(true);
  });
});

describe('sem DSN (desenvolvimento, testes, prévias)', () => {
  it('não carrega o SDK e não envia nada', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    expect(monitoramentoAtivo()).toBe(false);
    expect(await capturarErro(new Error('x'), 'global')).toBeUndefined();
    iniciarMonitoramento();
    expect(sdk.iniciar).not.toHaveBeenCalled();
    expect(sdk.capturar).not.toHaveBeenCalled();
  });
});

describe('com DSN', () => {
  beforeEach(() => vi.stubEnv('VITE_SENTRY_DSN', 'https://chave@o0.ingest.sentry.io/1'));

  it('carrega o SDK uma vez e devolve o código do evento', async () => {
    expect(await capturarErro(new Error('a'), 'dados')).toBe('0123456789abcdef0123456789abcdef');
    await capturarErro(new Error('b'), 'global');
    expect(sdk.iniciar).toHaveBeenCalledTimes(1);
    expect(sdk.iniciar).toHaveBeenCalledWith('https://chave@o0.ingest.sentry.io/1');
    expect(sdk.capturar).toHaveBeenCalledTimes(2);
    expect(sdk.capturar).toHaveBeenLastCalledWith(expect.any(Error), 'global');
  });

  it('erro esperado não carrega o SDK', async () => {
    expect(await capturarErro(new ErroConcorrencia(), 'dados')).toBeUndefined();
    expect(sdk.iniciar).not.toHaveBeenCalled();
  });

  it('falha do próprio monitoramento não chega à tela', async () => {
    sdk.capturar.mockImplementationOnce(() => {
      throw new Error('rede');
    });
    await expect(capturarErro(new Error('a'), 'rota')).resolves.toBeUndefined();
  });

  it('a tela de erro (E-09) mostra o código para o suporte', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderizarComRotas('/explode', [{ path: 'explode', element: <Explode /> }]);
    expect(await screen.findByText('Código do erro para o suporte:')).toBeInTheDocument();
    expect(screen.getByText('01234567')).toBeInTheDocument();
    expect(sdk.capturar).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'falha de teste' }),
      'rota',
    );
  });

  it('a página 404 não vai para o monitoramento', async () => {
    renderizarComRotas('/rota-que-nao-existe');
    await waitFor(() => expect(document.title).not.toBe(''));
    expect(sdk.capturar).not.toHaveBeenCalled();
  });
});

describe('a tela de erro sem monitoramento', () => {
  it('não mostra código', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderizarComRotas('/explode', [{ path: 'explode', element: <Explode /> }]);
    expect(await screen.findByText('Algo deu errado nesta tela.')).toBeInTheDocument();
    expect(screen.queryByText('Código do erro para o suporte:')).not.toBeInTheDocument();
  });
});
