import type { Sessao } from './auth'
import { emailValido, telefoneValido } from '../domain/contact'

const chaveContas = 'agendaja-demo-clientes-v1'
const chaveSessao = 'agendaja-demo-cliente-sessao-v1'

type ClienteDemo = {
  id: number
  nome: string
  telefone: string
  email: string
  senha: string
}

export type CadastroClienteDemo = Pick<ClienteDemo, 'nome' | 'telefone' | 'email' | 'senha'>

function lerContas(): ClienteDemo[] {
  try {
    const dados: unknown = JSON.parse(localStorage.getItem(chaveContas) ?? '[]')
    if (!Array.isArray(dados)) return []
    return dados.filter(
      (conta): conta is ClienteDemo =>
        typeof conta === 'object' &&
        conta !== null &&
        typeof conta.id === 'number' &&
        typeof conta.nome === 'string' &&
        typeof conta.telefone === 'string' &&
        typeof conta.email === 'string' &&
        typeof conta.senha === 'string',
    )
  } catch {
    return []
  }
}

function emailNormalizado(email: string) {
  return email.trim().toLowerCase()
}

export function existeClienteDemo(email: string) {
  return lerContas().some((conta) => conta.email === emailNormalizado(email))
}

export async function cadastrarClienteDemo(dados: CadastroClienteDemo) {
  const nome = dados.nome.trim()
  const telefone = dados.telefone.trim()
  const email = emailNormalizado(dados.email)
  if (!nome || !telefoneValido(telefone) || !emailValido(email) || dados.senha.length < 8)
    throw new Error('Preencha nome, telefone válido, e-mail e senha com pelo menos 8 caracteres.')

  const contas = lerContas()
  if (contas.some((conta) => conta.email === email))
    throw new Error('Já existe uma conta de demonstração com este e-mail.')

  const id = -(Date.now() * 1000 + Math.floor(Math.random() * 1000))
  localStorage.setItem(
    chaveContas,
    JSON.stringify([...contas, { id, nome, telefone, email, senha: dados.senha }]),
  )
}

export async function entrarClienteDemo(identificador: string, senha: string): Promise<Sessao> {
  const telefone = identificador.replace(/\D/g, '')
  const conta = lerContas().find(
    (cliente) =>
      (identificador.includes('@')
        ? cliente.email === emailNormalizado(identificador)
        : cliente.telefone.replace(/\D/g, '') === telefone) && cliente.senha === senha,
  )
  if (!conta)
    throw new Error(
      identificador.includes('@')
        ? 'E-mail ou senha inválidos para a conta de cliente.'
        : 'Telefone ou senha inválidos para a conta de cliente.',
    )
  localStorage.setItem(chaveSessao, String(conta.id))
  return {
    id: conta.id,
    nome: conta.nome,
    email: conta.email,
    role: 'CLIENTE',
    estabelecimentoId: null,
  }
}

export function buscarClienteDemoPorTelefone(telefone: string) {
  const conta = lerContas().find(
    (cliente) => cliente.telefone.replace(/\D/g, '') === telefone.replace(/\D/g, ''),
  )
  return conta ? { nome: conta.nome, telefone: conta.telefone, email: conta.email } : null
}

export function buscarSessaoClienteDemo(): Sessao | null {
  try {
    const id = Number(localStorage.getItem(chaveSessao))
    if (!id) return null
    const conta = lerContas().find((cliente) => cliente.id === id)
    if (!conta) return null
    return {
      id: conta.id,
      nome: conta.nome,
      email: conta.email,
      role: 'CLIENTE',
      estabelecimentoId: null,
    }
  } catch {
    return null
  }
}

export function sairClienteDemo() {
  localStorage.removeItem(chaveSessao)
}
