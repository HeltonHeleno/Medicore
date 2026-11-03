/**
 * 16.5.4 — ComboboxPaciente: só ativos, filtro "internados ou em atendimento", etiqueta
 * de situação lida pelo leitor de tela e teclado igual ao `Combobox`.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import {
  ComboboxPaciente,
  ResumoPaciente,
  type FiltroPaciente,
  type OpcaoPaciente,
} from '../components/pacientes/ComboboxPaciente';
import { Campo } from '../components/ui/form/Campo';
import { t } from '../i18n/pt-BR';
import { repoPacientes } from '../services/colecoes';
import { repoInternacoes, repoLeitos } from '../services/colecoes-operacoes';
import { darAlta } from '../services/leitos';
import { pacienteLivre, prepararOperacoes } from './utils/operacoes';

prepararOperacoes('2026-11-10T10:30:00-03:00');

function Teste(props: { filtro?: FiltroPaciente; mostrarSituacao?: boolean }) {
  const [valor, setValor] = useState<OpcaoPaciente | null>(null);
  return (
    <>
      <Campo rotulo="Paciente" obrigatorio>
        <ComboboxPaciente valor={valor} aoMudar={setValor} {...props} />
      </Campo>
      <output data-testid="valor">{valor?.id ?? 'nenhum'}</output>
    </>
  );
}

const internado = () => {
  const i = repoInternacoes.todos().find((x) => x.status === 'ativa')!;
  return {
    internacao: i,
    paciente: repoPacientes.obter(i.pacienteId)!,
    leito: repoLeitos.obter(i.leitoId)!,
  };
};

describe('ComboboxPaciente', () => {
  it('busca ativos por nome, mostra o CPF mascarado e escolhe só com teclado', async () => {
    const user = userEvent.setup();
    render(<Teste />);
    const campo = screen.getByRole('combobox', { name: /Paciente/ });
    const livre = pacienteLivre();
    await user.type(campo, livre.nome);
    const opcao = await screen.findByRole('option', {
      name: new RegExp(livre.nomeSocial ?? livre.nome),
    });
    expect(opcao).toHaveTextContent(/\*\*\*\.\d{3}\.\d{3}-\*\*/);
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('valor')).toHaveTextContent(livre.id);
    expect(campo).toHaveValue(livre.nomeSocial ?? livre.nome);
  });

  it('não lista pacientes inativos', async () => {
    const user = userEvent.setup();
    const inativo = repoPacientes.todos().find((p) => !p.ativo)!;
    render(<Teste />);
    await user.type(screen.getByRole('combobox'), inativo.nome);
    expect((await screen.findAllByText(t.formulario.nenhumResultado)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('option', { name: new RegExp(inativo.nome) })).toBeNull();
  });

  it('filtro: só internados ou em atendimento, com a etiqueta no nome da opção', async () => {
    const user = userEvent.setup();
    const { paciente, leito } = internado();
    render(<Teste filtro="internados_ou_em_atendimento" />);
    await user.type(screen.getByRole('combobox'), paciente.nome.split(' ')[0]);
    const opcao = await screen.findByRole('option', {
      name: new RegExp(`Internado em ${leito.codigo}`),
    });
    expect(opcao).toHaveTextContent(paciente.nomeSocial ?? paciente.nome);
    // Toda opção listada tem etiqueta (ninguém sem internação ou atendimento aparece).
    for (const o of screen.getAllByRole('option')) {
      expect(o).toHaveTextContent(/Internado em|Emergência E-/);
    }
    // Quem não está internado nem em atendimento não aparece (a busca responde "Nenhum resultado").
    const livre = pacienteLivre();
    await user.clear(screen.getByRole('combobox'));
    await user.type(screen.getByRole('combobox'), livre.nome);
    expect((await screen.findAllByText(t.formulario.nenhumResultado)).length).toBeGreaterThan(0);
  });

  it('a etiqueta acompanha a situação: depois da alta, o paciente sai do filtro', async () => {
    const user = userEvent.setup();
    const { internacao, paciente } = internado();
    render(<Teste filtro="internados_ou_em_atendimento" />);
    const campo = screen.getByRole('combobox');
    await user.type(campo, paciente.nome);
    await screen.findByRole('option', { name: new RegExp(paciente.nomeSocial ?? paciente.nome) });
    await darAlta(
      internacao.id,
      { tipo: 'melhorada', em: new Date().toISOString() },
      internacao.versao,
    );
    await user.type(campo, ' ');
    await user.keyboard('{Backspace}');
    await waitFor(() =>
      expect(
        screen.queryByRole('option', { name: new RegExp(paciente.nomeSocial ?? paciente.nome) }),
      ).toBeNull(),
    );
  });

  it('mostrarSituacao sem filtro: lista todos e etiqueta só quem tem situação', async () => {
    const user = userEvent.setup();
    const { paciente, leito } = internado();
    render(<Teste mostrarSituacao />);
    const campo = screen.getByRole('combobox');
    await user.type(campo, paciente.nome);
    await screen.findByRole('option', { name: new RegExp(`Internado em ${leito.codigo}`) });
    const livre = pacienteLivre();
    await user.clear(campo);
    await user.type(campo, livre.nome);
    const opcao = await screen.findByRole('option', {
      name: new RegExp(livre.nomeSocial ?? livre.nome),
    });
    expect(opcao).not.toHaveTextContent(/Internado em|Emergência E-/);
  });
});

describe('ResumoPaciente', () => {
  it('alergias em destaque; "Alergias não informadas" só quando pedido (R-F15)', () => {
    const comAlergia = repoPacientes.obter('pac-ana-silva')!;
    const semAlergia = repoPacientes.todos().find((p) => p.ativo && !p.alergias?.trim())!;
    const { unmount } = render(<ResumoPaciente paciente={comAlergia} />);
    expect(screen.getByRole('region', { name: 'Alergias' })).toHaveTextContent('Penicilina');
    unmount();
    const { rerender } = render(<ResumoPaciente paciente={semAlergia} />);
    expect(screen.queryByText(/Alergias não informadas/)).toBeNull();
    rerender(<ResumoPaciente paciente={semAlergia} avisarNaoInformadas />);
    expect(screen.getByText('Alergias não informadas — confirme com a equipe')).toBeInTheDocument();
  });
});
