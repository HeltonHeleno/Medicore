# MediCore 1.2.0 — Gestão de leitos, Emergência e Farmácia

- **Branch:** `release/1.2.0`, sobre a `feat/fase-21-qualidade-operacoes`
- **Ordem para mesclar na `main`:** PRs das Fases 19, 20 e 21 e, por último, este
- **Planos:** `docs/planos/PLANO_OPERACOES_MEDICORE.md` (especificação) e `docs/planos/PLANO_EXECUCAO_OPERACOES.md` (tarefas, diário e lições)

## O que há de novo desde a 1.1.0

- **Gestão de leitos** (`/leitos`):
  - mapa dos 130 leitos, com busca de paciente e previsão de liberação;
  - internar, transferir, dar alta, desfazer a alta (até 6 h);
  - higienização, bloqueio e pedidos de leito (da emergência e eletivos).
- **Emergência** (`/emergencia`):
  - chegada com ou sem identificação;
  - classificação de risco escolhida pelo profissional, fila por cor e prazo, alertas;
  - atendimento com observação, desfecho, reabertura (até 2 h) e pedido de leito.
- **Farmácia** (`/farmacia`):
  - catálogo e lotes com validade;
  - entrada em unidades ou embalagens;
  - dispensação por FEFO com alertas de alergia, controlado e quantidade alta;
  - devolução, estorno (até 24 h), ajustes, vencimentos e livro de controlados.
- **Painel:** ocupação, leitos disponíveis, casos de emergência, alertas, tendência de internações, estoque baixo e insights vêm dos módulos, em tempo real. Só "Desempenho por departamento" continua simulado.
- **Cadastros:**
  - situação e histórico hospitalar no detalhe do paciente;
  - internações e atendimentos no detalhe do médico;
  - aviso ao agendar consulta para paciente internado;
  - inativar e excluir respeitam as pendências nos módulos.
- **Óbito:** inativa o cadastro e cancela as consultas futuras.

## Números

| Indicador             | 1.1.0                | 1.2.0                                |
| --------------------- | -------------------- | ------------------------------------ |
| Testes Vitest         | 353                  | 672                                  |
| Testes Playwright     | 66                   | 139 (10 cenários de ponta a ponta)   |
| Cobertura de linhas   | 94,2%                | 92,3% (`services/` e `utils/` 97,8%) |
| Pacote inicial (gzip) | 145,7 kB             | 153,6 kB                             |
| Lighthouse do Painel  | 99 · 100 · 100 · 100 | 99 · 100 · 100 · 100                 |
| Dados de exemplo      | 73 KB                | 950 KB                               |

## Atenção ao atualizar

- Quem já usa a 1.1.0 recebe os módulos com dados de exemplo ligados aos pacientes e médicos que já existem. Os 90 pacientes de exemplo extras entram pela migração v2.
- **Novo limite prático do armazenamento no navegador:** 600 pacientes + 2.000 consultas, com os módulos no teto de cada coleção (73% de ~5 MB). Só os cadastros continuam indo até 1.000 + 3.000. Para volumes maiores, é preciso o backend (BL-01).
- Continua sendo um ambiente de demonstração, só com dados fictícios. O escopo é administrativo: o sistema não sugere diagnóstico, cor de risco, dose nem conduta.

## Pendências manuais

- Testar a URL publicada (desktop e celular) depois da publicação.
- NVDA, revisão de termos e mensagens e os testes com duas abas (`docs/VERIFICACAO_MANUAL.md`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01TpSdmCvMp9hkqHxXnLjuub
