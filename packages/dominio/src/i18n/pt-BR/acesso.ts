/**
 * Fase 28 (BL-02) — Textos de acesso: login, primeiro acesso, MFA, senha, sessão, perfis e
 * administração de usuários. Carregado só pelas telas de acesso e pela API.
 */
import type { Acao } from '../../permissoes';
import { nomesPerfis } from './perfis';

export const ta = {
  perfis: nomesPerfis,

  /** Completa "Seu perfil não permite …" (E-20). */
  acoes: {
    ver: 'ver esta informação',
    'usuarios.administrar': 'administrar usuários',
    'pacientes.editar': 'cadastrar ou editar pacientes',
    'pacientes.verCpf': 'ver o CPF completo',
    'medicos.editar': 'cadastrar ou editar médicos',
    'agenda.editar': 'agendar ou alterar consultas',
    'emergencia.chegada': 'registrar chegadas na emergência',
    'emergencia.triagem': 'fazer a triagem',
    'emergencia.atendimento': 'atender na emergência',
    'emergencia.reabrir': 'reabrir atendimentos',
    'internacao.editar': 'internar, transferir ou editar internações',
    'internacao.alta': 'dar ou desfazer alta',
    'leitos.higienizacao': 'concluir higienizações',
    'leitos.bloqueio': 'bloquear leitos ou cuidar dos pedidos de leito',
    'farmacia.estoque': 'cuidar do estoque da farmácia',
    'farmacia.dispensacao': 'dispensar medicamentos',
    'auditoria.ver': 'consultar a auditoria',
    'relatorios.ver': 'ver relatórios',
  } satisfies Record<Acao, string>,

  /** Ação de segurança das gravações (R-AU4). */
  semCodigoSeguranca: 'gravar sem o código de segurança da sessão',

  login: {
    titulo: 'Entrar no MediCore',
    descricao: 'Use o e-mail e a senha da sua conta.',
    email: 'E-mail',
    senha: 'Senha',
    entrar: 'Entrar',
    entrando: 'Entrando…',
    esqueci: 'Esqueci a senha',
    incorretos: 'E-mail ou senha incorretos.',
    contaDesativada: 'Conta desativada. Fale com o administrador.',
    demonstracaoTitulo: 'Contas de demonstração',
    demonstracaoDescricao:
      'Entre com um perfil para conhecer o sistema. Os dados são fictícios e voltam ao original todo dia.',
    demonstracaoTodos: 'Equipe completa (todos os perfis)',
    entrarComo: (perfil: string) => `Entrar como ${perfil}`,
  },

  mfa: {
    titulo: 'Código de verificação',
    descricao: 'Digite o código de 6 dígitos do aplicativo autenticador.',
    codigo: 'Código',
    confirmar: 'Confirmar',
    usarRecuperacao: 'Usar um código de recuperação',
    usarAplicativo: 'Usar o código do aplicativo',
    codigoRecuperacao: 'Código de recuperação',
    incorreto: 'Código incorreto. Confira o aplicativo e tente de novo.',
    expirado: 'O tempo para digitar o código acabou. Entre de novo.',
    configurarTitulo: 'Proteja sua conta com o segundo fator',
    configurarDescricao:
      'Seu perfil exige um código a cada entrada. Leia o QR code com um aplicativo autenticador (Google Authenticator, Microsoft Authenticator…) e digite o código que aparecer.',
    qrRotulo: 'QR code para o aplicativo autenticador',
    chaveManual: 'Sem câmera? Digite esta chave no aplicativo:',
    recuperacaoTitulo: 'Guarde os códigos de recuperação',
    recuperacaoDescricao:
      'Cada código entra uma vez, se você perder o celular. Eles não serão mostrados de novo.',
    copiarCodigos: 'Copiar os códigos',
    copiados: 'Códigos copiados.',
    guardei: 'Guardei os códigos',
  },

  senha: {
    nova: 'Nova senha',
    confirmar: 'Confirme a nova senha',
    dica: 'No mínimo 12 caracteres. Uma frase com palavras que só você liga é fácil de lembrar e difícil de adivinhar.',
    curta: 'A senha precisa ter 12 caracteres ou mais.',
    comum: 'Essa senha é conhecida ou fácil de adivinhar. Escolha outra.',
    diferentes: 'As senhas não são iguais.',
    definir: 'Definir a senha',
  },

  convite: {
    titulo: 'Primeiro acesso',
    descricao: (nome: string) => `Olá, ${nome}. Defina a senha da sua conta.`,
    invalido: 'Este convite venceu ou já foi usado. Peça um novo ao administrador.',
    assunto: 'Seu acesso ao MediCore',
    corpo: (nome: string, link: string) =>
      `Olá, ${nome}.\n\nVocê foi convidado(a) para o MediCore. Defina sua senha neste link (vale por 48 horas, uma vez só):\n\n${link}\n\nSe não esperava este convite, ignore este e-mail.`,
  },

  esqueci: {
    titulo: 'Esqueci a senha',
    descricao:
      'Digite o e-mail da conta. Se ela existir, enviamos um link para criar uma senha nova.',
    enviar: 'Enviar o link',
    enviado:
      'Se o e-mail for de uma conta ativa, o link chega em alguns minutos. Ele vale por 30 minutos.',
    voltar: 'Voltar para o login',
    semEmail:
      'Este ambiente não envia e-mails. Peça ao administrador um link para criar uma senha nova.',
    assunto: 'Redefinir a senha do MediCore',
    corpo: (nome: string, link: string) =>
      `Olá, ${nome}.\n\nPara criar uma senha nova, use este link (vale por 30 minutos, uma vez só):\n\n${link}\n\nSe não foi você, ignore este e-mail: sua senha continua a mesma.`,
  },

  redefinir: {
    titulo: 'Criar uma senha nova',
    invalido: 'Este link venceu ou já foi usado. Peça outro em "Esqueci a senha".',
    concluido: 'Senha nova definida. Todas as sessões abertas foram encerradas; entre de novo.',
  },

  sessao: {
    expiradaTitulo: 'Sua sessão terminou',
    expiradaDescricao:
      'Entre de novo para continuar. O que você estava preenchendo continua na tela.',
    sair: 'Sair',
    saindo: 'Saindo…',
    verificando: 'Conferindo a sessão…',
  },

  usuarios: {
    titulo: 'Usuários',
    descricao: 'Quem entra no sistema e o que cada perfil pode fazer.',
    convidar: 'Convidar usuário',
    nome: 'Nome',
    email: 'E-mail',
    perfis: 'Perfis',
    medico: 'Médico vinculado',
    medicoNenhum: 'Nenhum',
    situacao: 'Situação',
    ultimoAcesso: 'Último acesso',
    nunca: 'Nunca entrou',
    ativo: 'Ativo',
    inativo: 'Desativado',
    convidado: 'Convite enviado',
    bloqueado: 'Bloqueado por tentativas',
    mfa: 'Segundo fator',
    mfaAtivo: 'Ativo',
    mfaPendente: 'A configurar',
    acoes: 'Ações',
    editar: 'Editar',
    salvar: 'Salvar',
    cancelar: 'Cancelar',
    desativar: 'Desativar',
    reativar: 'Reativar',
    desbloquear: 'Desbloquear',
    redefinirMfa: 'Redefinir o segundo fator',
    reenviarConvite: 'Gerar novo convite',
    redefinirSenha: 'Gerar link de nova senha',
    linkTitulo: 'Link para a pessoa',
    linkDescricao:
      'Envie este link para a pessoa (vale uma vez só). Ele não será mostrado de novo.',
    linkEnviado: (email: string) => `Link enviado para ${email}.`,
    copiarLink: 'Copiar o link',
    copiado: 'Link copiado.',
    convidado_: (nome: string) => `${nome} convidado(a).`,
    salvo: 'Usuário atualizado.',
    desativado: (nome: string) => `${nome} desativado(a). As sessões foram encerradas.`,
    reativado: (nome: string) => `${nome} reativado(a).`,
    desbloqueado: (nome: string) => `${nome} pode entrar de novo.`,
    mfaRedefinido: (nome: string) =>
      `O segundo fator de ${nome} foi apagado. Na próxima entrada, a pessoa configura de novo.`,
    confirmarDesativar: (nome: string) => `Desativar ${nome}?`,
    confirmarDesativarTexto: 'A pessoa não consegue mais entrar. O histórico continua.',
    ultimoAdministrador:
      'Este é o último administrador ativo. Dê o perfil Administrador a outra pessoa antes.',
    emailDuplicado: 'Já existe um usuário com este e-mail.',
    perfilObrigatorio: 'Escolha ao menos um perfil.',
    medicoObrigatorio: 'Com o perfil Médico, escolha o cadastro do médico.',
    medicoInvalido: 'Médico não encontrado ou inativo.',
    naoEncontrado: 'Usuário não encontrado.',
    vazio: 'Nenhum usuário.',
  },

  emailNaoConfigurado:
    'O envio de e-mails não está configurado neste ambiente: o link aparece aqui para você enviar.',
  demonstracaoIndisponivel: 'As contas de demonstração não existem neste ambiente.',
};
