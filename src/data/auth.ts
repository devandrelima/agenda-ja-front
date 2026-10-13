export type Sessao = {
  id: number
  nome: string
  email: string
  role: string
  estabelecimentoId: number | null
}

export type CadastroEstabelecimento = {
  nomeNegocio: string
  categoria: string
  localizacao: string
  nomeGestor: string
  email: string
  senha: string
}

export class ErroApi extends Error {
  constructor(
    public status: number,
    mensagem: string,
    public erros: Record<string, string> = {},
  ) {
    super(mensagem)
  }
}

async function requisitar(caminho: string, opcoes?: RequestInit): Promise<Response> {
  let resposta: Response

  try {
    resposta = await fetch(caminho, { ...opcoes, credentials: 'same-origin', cache: 'no-store' })
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Tente novamente em instantes.')
  }

  if (!resposta.ok) {
    const dados = await resposta.json().catch(() => null)
    const mensagem =
      typeof dados?.mensagem === 'string'
        ? dados.mensagem
        : 'Não foi possível concluir a solicitação.'
    const erros = dados?.erros && typeof dados.erros === 'object' ? dados.erros : {}
    throw new ErroApi(resposta.status, mensagem, erros)
  }

  return resposta
}

async function tokenCsrf(): Promise<string> {
  const resposta = await requisitar('/api/auth/csrf')
  const dados: { token: string } = await resposta.json()
  return dados.token
}

async function enviar(caminho: string, corpo?: object): Promise<Response> {
  const token = await tokenCsrf()
  return requisitar(caminho, {
    method: 'POST',
    headers: {
      'X-CSRF-TOKEN': token,
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  })
}

export async function buscarSessao(): Promise<Sessao> {
  const resposta = await requisitar('/api/auth/me')
  return resposta.json()
}

export async function entrar(email: string, senha: string): Promise<Sessao> {
  const resposta = await enviar('/api/auth/login', { email: email.trim(), senha })
  return resposta.json()
}

export async function cadastrarEstabelecimento(dados: CadastroEstabelecimento): Promise<void> {
  await enviar('/api/estabelecimentos', dados)
}

export async function sair(): Promise<void> {
  await enviar('/api/auth/logout')
}
