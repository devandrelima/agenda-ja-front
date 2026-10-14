import { requisitar, tokenCsrf } from './api'

export type Servico = {
  id: number
  nome: string
  duracaoMinutos: number
  valor: number
  estabelecimentoId: number
}

export type DadosServico = Pick<Servico, 'nome' | 'duracaoMinutos' | 'valor'>

function caminhoServicos(estabelecimentoId: number) {
  return `/api/admin/estabelecimentos/${estabelecimentoId}/servicos`
}

export async function listarServicos(estabelecimentoId: number): Promise<Servico[]> {
  const resposta = await requisitar(caminhoServicos(estabelecimentoId))
  return resposta.json()
}

async function salvarServico(
  caminho: string,
  metodo: 'POST' | 'PUT',
  dados: DadosServico,
): Promise<Servico> {
  const token = await tokenCsrf()
  const resposta = await requisitar(caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
    body: JSON.stringify(dados),
  })
  return resposta.json()
}

export function cadastrarServico(estabelecimentoId: number, dados: DadosServico) {
  return salvarServico(caminhoServicos(estabelecimentoId), 'POST', dados)
}

export function editarServico(estabelecimentoId: number, servicoId: number, dados: DadosServico) {
  return salvarServico(`${caminhoServicos(estabelecimentoId)}/${servicoId}`, 'PUT', dados)
}

export async function desativarServico(estabelecimentoId: number, servicoId: number): Promise<void> {
  const token = await tokenCsrf()
  await requisitar(`${caminhoServicos(estabelecimentoId)}/${servicoId}`, {
    method: 'DELETE',
    headers: { 'X-CSRF-TOKEN': token },
  })
}
