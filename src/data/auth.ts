import { requisitar, tokenCsrf } from './api'
export { ErroApi } from './api'

export type Sessao = {
  id: number
  nome: string
  email: string
  telefone?: string | null
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

export type CadastroCliente = {
  nome: string
  telefone: string
  email: string
  senha: string
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

export async function cadastrarCliente(dados: CadastroCliente): Promise<void> {
  await enviar('/api/clientes', dados)
}

export async function sair(): Promise<void> {
  await enviar('/api/auth/logout')
}
