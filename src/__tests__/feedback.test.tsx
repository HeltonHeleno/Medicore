import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router-dom';
import { z } from 'zod';
import { BannerDemonstracao } from '../components/layout/BannerDemonstracao';
import { Button } from '../components/ui/Button';
import { ConfirmacaoProvider } from '../components/ui/feedback/DialogoConfirmacao';
import { Modal } from '../components/ui/feedback/Modal';
import { ToastProvider } from '../components/ui/feedback/ToastProvider';
import { Campo } from '../components/ui/form/Campo';
import { Input } from '../components/ui/form/Input';
import { ResumoErros } from '../components/ui/form/ResumoErros';
import { useConfirmar } from '../hooks/useConfirmar';
import { useFormularioEntidade } from '../hooks/useFormularioEntidade';
import { useToast } from '../hooks/useToast';
import { textoObrigatorio } from '../schemas/comuns';
import { ErroConflito } from '../services/erros';
import { renderizarComRotas } from './utils/renderizarComRotas';

const Provedores = ({ children }: { children: ReactNode }) => (
  <ToastProvider>
    <ConfirmacaoProvider>{children}</ConfirmacaoProvider>
  </ToastProvider>
);

describe('Modal', () => {
  function ComModal() {
    const [aberto, setAberto] = useState(false);
    return (
      <>
        <Button onClick={() => setAberto(true)}>Abrir</Button>
        <Modal
          aberto={aberto}
          aoFechar={() => setAberto(false)}
          titulo="Detalhes"
          descricao="Texto de apoio"
          rodape={<Button onClick={() => setAberto(false)}>OK</Button>}
        >
          <input aria-label="Campo do modal" />
        </Modal>
      </>
    );
  }

  it('prende o foco, fecha com Esc e devolve o foco ao botão', async () => {
    render(<ComModal />);
    const abrir = screen.getByRole('button', { name: 'Abrir' });
    await userEvent.click(abrir);
    const dialogo = screen.getByRole('dialog', { name: 'Detalhes' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAccessibleDescription('Texto de apoio');
    const fechar = within(dialogo).getByRole('button', { name: 'Fechar janela' });
    expect(fechar).toHaveFocus();

    await userEvent.tab();
    expect(within(dialogo).getByRole('textbox')).toHaveFocus();
    await userEvent.tab();
    expect(within(dialogo).getByRole('button', { name: 'OK' })).toHaveFocus();
    await userEvent.tab(); // volta ao primeiro
    expect(fechar).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(within(dialogo).getByRole('button', { name: 'OK' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(abrir).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });
});

describe('useConfirmar', () => {
  function Pergunta({ exigirTexto }: { exigirTexto?: string }) {
    const confirmar = useConfirmar();
    const [resposta, setResposta] = useState('?');
    return (
      <>
        <Button
          onClick={async () =>
            setResposta(
              String(
                await confirmar({
                  titulo: 'Excluir paciente?',
                  perigo: true,
                  exigirTexto,
                  rotuloConfirmar: 'Excluir',
                }),
              ),
            )
          }
        >
          Perguntar
        </Button>
        <output data-testid="resposta">{resposta}</output>
      </>
    );
  }

  it('resolve true ao confirmar e false ao cancelar; perigo foca "Cancelar"', async () => {
    render(
      <Provedores>
        <Pergunta />
      </Provedores>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Perguntar' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'Excluir paciente?' });
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }));
    expect(screen.getByTestId('resposta')).toHaveTextContent('true');

    await userEvent.click(screen.getByRole('button', { name: 'Perguntar' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByTestId('resposta')).toHaveTextContent('false');
  });

  it('exigirTexto só libera o botão com o texto exato (P5)', async () => {
    render(
      <Provedores>
        <Pergunta exigirTexto="EXCLUIR" />
      </Provedores>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Perguntar' }));
    const campo = screen.getByRole('textbox', { name: 'Para confirmar, digite "EXCLUIR"' });
    expect(campo).toHaveFocus();
    const excluir = screen.getByRole('button', { name: 'Excluir' });
    expect(excluir).toBeDisabled();
    await userEvent.type(campo, 'EXCLUI');
    expect(excluir).toBeDisabled();
    await userEvent.type(campo, 'R{Enter}');
    expect(screen.getByTestId('resposta')).toHaveTextContent('true');
  });
});

describe('Toast', () => {
  function Disparos() {
    const toast = useToast();
    const [acao, setAcao] = useState(false);
    return (
      <>
        <Button
          onClick={() =>
            toast.sucesso('Paciente cadastrado', {
              acao: { rotulo: 'Ver consultas', aoClicar: () => setAcao(true) },
            })
          }
        >
          ok
        </Button>
        <Button onClick={() => toast.erro('Não foi possível salvar')}>falha</Button>
        <output data-testid="acao">{String(acao)}</output>
      </>
    );
  }

  it('sucesso some em 5 s; erro fica até fechar; ação funciona', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <Provedores>
        <Disparos />
      </Provedores>,
    );
    await user.click(screen.getByRole('button', { name: 'ok' }));
    await user.click(screen.getByRole('button', { name: 'falha' }));
    // (o <output> do teste também tem role="status"; por isso a busca é dentro da região)
    const regiao = screen.getByRole('region', { name: 'Notificações' });
    expect(
      within(within(regiao).getByRole('status')).getByText('Paciente cadastrado'),
    ).toBeInTheDocument();
    expect(
      within(within(regiao).getByRole('alert')).getByText('Não foi possível salvar'),
    ).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(5100));
    expect(screen.queryByText('Paciente cadastrado')).not.toBeInTheDocument();
    expect(screen.getByText('Não foi possível salvar')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fechar notificação' }));
    expect(screen.queryByText('Não foi possível salvar')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'ok' }));
    await user.click(screen.getByRole('button', { name: 'Ver consultas' }));
    expect(screen.getByTestId('acao')).toHaveTextContent('true');
    expect(screen.queryByText('Paciente cadastrado')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe('useFormularioEntidade', () => {
  const esquema = z.object({ nome: textoObrigatorio(3, 50), apelido: textoObrigatorio(2, 20) });
  const salvar = vi.fn<(d: z.output<typeof esquema>) => Promise<void>>();

  function Formulario() {
    const { form, enviar, enviando, resumo, tentativa } = useFormularioEntidade({
      esquema,
      valoresIniciais: { nome: '', apelido: '' },
      aoEnviar: salvar,
      rotulos: { nome: 'Nome', apelido: 'Apelido' },
    });
    const { errors } = form.formState;
    return (
      <form onSubmit={enviar} noValidate>
        <ResumoErros erros={resumo} tentativa={tentativa} />
        <Campo rotulo="Nome" nome="nome" erro={errors.nome?.message}>
          <Input {...form.register('nome')} />
        </Campo>
        <Campo rotulo="Apelido" nome="apelido" erro={errors.apelido?.message}>
          <Input {...form.register('apelido')} />
        </Campo>
        <Button type="submit" disabled={enviando}>
          Salvar
        </Button>
        <Link to="/outra">Sair</Link>
      </form>
    );
  }

  const montar = () => {
    const router = createMemoryRouter(
      [
        {
          element: (
            <Provedores>
              <Outlet />
            </Provedores>
          ),
          children: [
            { path: '/', element: <Formulario /> },
            { path: '/outra', element: <h1>Outra página</h1> },
          ],
        },
      ],
      { initialEntries: ['/'] },
    );
    render(<RouterProvider router={router} />);
    return router;
  };

  beforeEach(() => salvar.mockReset());

  it('sem alterações, sai sem perguntar', async () => {
    montar();
    await userEvent.click(screen.getByRole('link', { name: 'Sair' }));
    expect(await screen.findByRole('heading', { name: 'Outra página' })).toBeInTheDocument();
  });

  it('com alterações, pergunta; "Continuar editando" fica, "Descartar" sai', async () => {
    montar();
    await userEvent.type(screen.getByRole('textbox', { name: 'Nome' }), 'Ana');
    await userEvent.click(screen.getByRole('link', { name: 'Sair' }));
    const dialogo = await screen.findByRole('alertdialog', { name: 'Descartar alterações?' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Continuar editando' }));
    expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveValue('Ana');

    await userEvent.click(screen.getByRole('link', { name: 'Sair' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }));
    expect(await screen.findByRole('heading', { name: 'Outra página' })).toBeInTheDocument();
  });

  it('ao salvar com erros: foco no 1º campo e resumo com links', async () => {
    montar();
    await userEvent.type(screen.getByRole('textbox', { name: 'Apelido' }), 'Lu');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    const nome = screen.getByRole('textbox', { name: 'Nome' });
    await waitFor(() => expect(nome).toHaveFocus());
    const resumo = screen.getByText('1 campo precisa de correção').closest('[role="alert"]')!;
    const link = within(resumo as HTMLElement).getByRole('link', { name: /^Nome:/ });
    screen.getByRole('textbox', { name: 'Apelido' }).focus();
    await userEvent.click(link);
    expect(nome).toHaveFocus();
    expect(salvar).not.toHaveBeenCalled();
  });

  it('erro do serviço vai para o campo e o que foi digitado fica', async () => {
    salvar.mockRejectedValueOnce(
      new ErroConflito('cpf_duplicado', 'Já existe um cadastro com este apelido', {
        campo: 'apelido',
      }),
    );
    montar();
    await userEvent.type(screen.getByRole('textbox', { name: 'Nome' }), 'Ana Lima');
    await userEvent.type(screen.getByRole('textbox', { name: 'Apelido' }), 'Lu');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    const apelido = screen.getByRole('textbox', { name: 'Apelido' });
    await waitFor(() =>
      expect(apelido).toHaveAccessibleDescription('Já existe um cadastro com este apelido'),
    );
    expect(apelido).toHaveFocus();
    expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveValue('Ana Lima');
  });

  it('erro sem campo vira toast; depois de salvar, navegar não é bloqueado', async () => {
    salvar.mockRejectedValueOnce(new Error('Armazenamento cheio'));
    const router = montar();
    salvar.mockImplementationOnce(async () => {
      await router.navigate('/outra');
    });
    await userEvent.type(screen.getByRole('textbox', { name: 'Nome' }), 'Ana Lima');
    await userEvent.type(screen.getByRole('textbox', { name: 'Apelido' }), 'Lu');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Armazenamento cheio')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('heading', { name: 'Outra página' })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('BannerDemonstracao (RS-01)', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('aparece por padrão e some com VITE_AMBIENTE=producao', () => {
    const { rerender } = render(<BannerDemonstracao />);
    expect(screen.getByText(/Ambiente de demonstração/)).toBeInTheDocument();
    vi.stubEnv('VITE_AMBIENTE', 'producao');
    rerender(<BannerDemonstracao />);
    expect(screen.queryByText(/Ambiente de demonstração/)).not.toBeInTheDocument();
  });
});

describe('useAnunciarRota (M11)', () => {
  it('não mexe no foco na 1ª carga; ao navegar, foca o h1 e anuncia a página', async () => {
    renderizarComRotas('/');
    await screen.findByRole('heading', { level: 1 });
    expect(document.activeElement).toBe(document.body);

    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    await userEvent.click(within(nav).getByRole('link', { name: 'Pacientes' }));
    const h1 = await screen.findByRole('heading', { level: 1, name: 'Pacientes' });
    await waitFor(() => expect(h1).toHaveFocus());
    expect(screen.getByText('Página: Pacientes')).toHaveAttribute('aria-live', 'polite');
  });
});
