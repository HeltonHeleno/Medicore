# Fase 28 — Autenticação e perfis de acesso (BL-02)

- **Branch:** `feat/fase-28-autenticacao` (sobre a `main` com a Fase 27)
- **Plano:** `PLANO_EXECUCAO_MELHORIAS.md`, tarefas 28.0 a 28.F
- **Especificação:** `PLANO_MELHORIAS_MEDICORE.md`, BL-02.1 a BL-02.7, D29–D31, R-AU1–R-AU5, E-17, E-19–E-21

## Resumo

No modo API (`VITE_API_URL`), cada pessoa entra com a própria conta e só vê e faz o que o perfil permite. A API confere a permissão em **todas** as rotas e nega por padrão: uma rota de gravação sem ação definida impede a API de subir. O modo navegador (sem `VITE_API_URL`) continua sem login, com tudo liberado.

### Entrar, sessão e segundo fator (BL-02.1, BL-02.2, BL-02.4)

- **Senha com Argon2id** (R-AU1). Mínimo de 12 caracteres e recusa das senhas conhecidas (lista local de ~10 mil, mais palavras em português), do e-mail e de repetições.
- **Mensagem única** para e-mail ou senha errados. Conta desativada tem a própria mensagem.
- **Bloqueio progressivo por e-mail** (R-AU3, E-21): 5 erros bloqueiam 15 min e 10 erros, 1 h. Vale também para e-mail sem conta, para não revelar quem existe. O administrador pode desbloquear.
- **Sessão em cookie** `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/api`. O banco guarda só o hash do token.
  - Termina com 30 min sem uso ou 12 h depois de entrar.
  - Toda gravação leva o **código de segurança da sessão** no cabeçalho `X-CSRF-Token` (R-AU4).
- **MFA por TOTP**, obrigatório para Administrador e Gestão (R-AU2):
  - no primeiro acesso: QR code, chave para digitar e **10 códigos de recuperação** de uso único;
  - a etapa do código dura 5 min.
- **E-19 sem perder o formulário:** se a sessão termina com a tela aberta, um aviso pede o login ali mesmo. O que estava preenchido continua na tela.

### Convite e senha (BL-02.2, BL-02.3)

- **Convite:** vale 48 h, uma vez só. A pessoa define a senha e, se o perfil exigir, o segundo fator.
- **Esqueci a senha:**
  - a resposta é a mesma exista a conta ou não;
  - o link vale 30 min, uma vez só;
  - a senha nova encerra todas as sessões.
- **Os links** levam o token depois do `#`: ele não chega a nenhum servidor nem fica no histórico (a tela tira da barra de endereço).
- **E-mail é opcional** (`EMAIL_PROVEDOR=resend`). Sem provedor, o administrador recebe o link para copiar e enviar, e o "esqueci a senha" pede para falar com ele.

### Administrar usuários (BL-02.5)

Em **Configurações → Usuários** (só o perfil Administrador), dá para:

- convidar e editar nome, e-mail, perfis e o médico vinculado (o perfil Médico pede o cadastro);
- desativar e reativar;
- desbloquear;
- redefinir o segundo fator;
- gerar um convite novo ou o link de senha nova.

Regras:

- Mudar os perfis ou desativar encerra as sessões da pessoa.
- **E-17:** sempre sobra um Administrador ativo.
- A **primeira conta** sai pela linha de comando, que mostra o link do primeiro acesso: `npm run acesso:primeiro-admin -w @medicore/api -- "Nome" email`.

### Permissões (BL-02.6) e autor (BL-02.7)

- **A matriz é uma só**, em `packages/dominio/src/permissoes.ts`: 7 perfis e 18 ações. A API e o navegador usam a mesma.
- **API:** a tabela `apps/api/src/acesso/rotas-permissoes.ts` diz que ação cada rota exige. As leituras exigem só a sessão.
- **Navegador:** `usePermissao`/`usePode` e `<SePode>` escondem o que o perfil não pode fazer:
  - os botões das páginas;
  - os itens dos menus "⋯";
  - as ações do leito e do atendimento;
  - as ações rápidas da agenda e da fila.
- **CPF:** completo só com `pacientes.verCpf`; os outros perfis veem `***.982.247-**`. A Enfermagem edita o paciente sem ver o CPF, e a API mantém o CPF gravado.
- **Cabeçalho e Painel:** o "Dr. Ricardo Almeida" fixo dá lugar ao usuário da sessão e aos perfis dele. "Sair" encerra a sessão.
- **Autor (D31):** eventos, pedidos, bloqueios, movimentações, dispensações e atividades gravam `autor` (o nome) e `autorId`. Os registros antigos ficam como estão.

### Contas de demonstração

Fora da produção, a tela de login tem um botão por perfil e a "equipe completa", que tem todos os perfis e assina como "Usuário de demonstração". Essas contas entram sem senha nem MFA. Com `AMBIENTE=producao`, a rota responde 404, e a configuração recusa `LOGIN_DEMONSTRACAO=sim`.

### Mesmo endereço para o app e a API

Para o cookie ser de primeira parte (`SameSite=Lax`), o app chama `/api` no próprio endereço:

- **na Vercel:** o `middleware.ts` da raiz (Routing Middleware) repassa para `API_ORIGEM`;
- **localmente:** quem repassa é o proxy do Vite (`VITE_API_PROXY`), no `npm run dev` e no `preview` dos testes.

`VITE_API_URL` passa a ser `/`. O guia `docs/backend/PUBLICACAO.md` foi atualizado com as variáveis novas, o e-mail e a primeira conta.

## Achados

1. **Falha de rede passava como sucesso no cliente HTTP:** `criarChamada` só tratava `status >= 400` como erro. O status 0 (sem rede, tempo esgotado) devolvia `null` à tela em vez de `ErroRede` (E-22). Corrigido em `cliente/cadastros.ts`.
2. **A tela de login sumia antes dos códigos de recuperação:** a página redirecionava assim que a sessão ficava ativa, o que acontece ao confirmar o MFA, antes de mostrar os códigos. Agora só redireciona quem chega já com sessão.
3. **Ids repetidos no aviso E-19:** o formulário de login dentro do aviso usava os mesmos ids (`email`) do formulário da tela de baixo, e o rótulo apontava para o campo errado. Agora os ids são próprios.
4. **Testes que pulam horas:** com sessão de 30 min, os cenários que avançam o relógio perderiam a sessão. Duas mudanças resolvem:
   - a rota de teste do relógio renova as sessões abertas;
   - o cookie usa `Max-Age` em vez de `Expires`, porque o relógio do navegador dos testes está no passado.

## Números

O pacote inicial cresceu um pouco: a matriz de permissões, os ganchos da sessão e os nomes dos perfis entram em toda tela. O login, o MFA e a administração são carregados à parte, só no modo API.

| Indicador             | Fase 27                             | Fase 28                                                                                 |
| --------------------- | ----------------------------------- | --------------------------------------------------------------------------------------- |
| Testes da API         | 329                                 | **372 (25 arquivos)** (+ acesso: 32, matriz: 11)                                        |
| Testes do domínio     | 233                                 | **241** (cobertura 96,4%)                                                               |
| Testes do app         | 552                                 | **582**                                                                                 |
| Cobertura             | API 97,6%, domínio 96,2%, app 91,0% | API **97,6%**, domínio **96,4%**, app **91,4%** de linhas                               |
| Playwright, modo API  | 11 + 1 pulado                       | **20 + 1 pulado (cenários 1 a 10 e 9 de acesso), 2 rodadas verdes; modo navegador 139** |
| Pacote inicial (gzip) | 154,2 kB navegador; 144,4 kB API    | **156,0 kB** navegador; **147,5 kB** API                                                |

### Matriz de permissões (28.T.1)

O teste `apps/api/test/acesso/matriz.test.ts` descobre todas as rotas no registro do Fastify, sem lista escrita à mão, e confere três coisas:

- **sem sessão:** toda rota não pública responde 401;
- **perfil que pode:** nunca recebe 403 (nem 401);
- **perfil que não pode:** recebe 403 com a ação no corpo.

São 7 perfis × todas as rotas. O teste também falha se a tabela citar uma rota que não existe mais.

## Verificação

- [x] `lint`, `format:check`, `typecheck`, `actionlint`
- [x] Testes da API, do domínio e do app verdes, com as metas de cobertura
- [x] **28.T.1:** matriz rota × perfil, 100%
- [x] **28.T.2:** e2e no modo API, que cobre:
  - convite → senha → MFA → nova entrada com o código;
  - sessão que termina com o formulário preenchido;
  - Recepção sem "Dar alta";
  - Farmácia sem triagem, e a API recusando (E-20);
  - axe nas telas novas.
- [x] **28.T.4:** teste confere que senha, token, código TOTP, código de recuperação, cookie, código de segurança e e-mail não aparecem no log
- [ ] 👤 **28.T.3:** OWASP ZAP básico contra a homologação publicada (não roda neste ambiente)
- [ ] 👤 Conta no Resend e domínio verificado, se quiser os e-mails (opcional)
- [ ] 👤 Na Vercel: `VITE_API_URL=/` e `API_ORIGEM` (Production e Preview), quando a API estiver publicada
- [ ] 👤 CI verde no GitHub e PR mesclado **depois** do `verificacoes` terminar

## Para o revisor

- **Por que o proxy e não CORS com cookie:** com o app na Vercel e a API no Cloud Run em domínios diferentes, o cookie da sessão seria de terceira parte. Os navegadores bloqueiam esse cookie cada vez mais, e `SameSite=None` abriria espaço para CSRF. O proxy deixa tudo no mesmo endereço.
- **Segredo do TOTP em texto no banco:** fica assim até o BL-04 (Fase 30), que cifra os campos sensíveis com o KMS. A coluna já está marcada no esquema.
- **Contas de demonstração sem MFA:** é de propósito, para a demonstração abrir com um clique. Elas nunca existem em produção.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01TpSdmCvMp9hkqHxXnLjuub
