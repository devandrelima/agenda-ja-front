import { requisitar, tokenCsrf } from './api'

export type PerfilCliente = {
  id: number
  nome: string
  telefone: string
  email: string
  fotoUrl: string | null
}

export type PerfilClienteAtualizacao = Pick<PerfilCliente, 'nome' | 'telefone' | 'email' | 'fotoUrl'>

export async function buscarMeuPerfil(): Promise<PerfilCliente> {
  const resposta = await requisitar('/api/clientes/me')
  return resposta.json()
}

export async function atualizarMeuPerfil(dados: PerfilClienteAtualizacao): Promise<PerfilCliente> {
  const token = await tokenCsrf()
  const resposta = await requisitar('/api/clientes/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
    body: JSON.stringify(dados),
  })
  return resposta.json()
}

export async function desativarMinhaConta(): Promise<void> {
  const token = await tokenCsrf()
  await requisitar('/api/clientes/me', { method: 'DELETE', headers: { 'X-CSRF-TOKEN': token } })
}
