import { requisitar, tokenCsrf } from './api'
import type { Avaliacao } from '../domain/models'

type AvaliacaoApi = {
  id: number
  clienteId: number
  nomeCliente: string
  nota: number
  comentario: string
  criadoEm: string
  atualizadoEm: string | null
}

export type ResumoAvaliacoesApi = {
  quantidade: number
  media: number
}

function paraAvaliacao(avaliacao: AvaliacaoApi): Avaliacao {
  return {
    id: String(avaliacao.id),
    autorId: avaliacao.clienteId,
    nomeCliente: avaliacao.nomeCliente,
    estrelas: avaliacao.nota,
    comentario: avaliacao.comentario,
    publicadoEm: avaliacao.criadoEm,
    editadoEm: avaliacao.atualizadoEm ?? undefined,
  }
}

const caminho = (estabelecimentoId: number) =>
  `/api/estabelecimentos/${encodeURIComponent(estabelecimentoId)}/avaliacoes`

async function enviar(estabelecimentoId: number, metodo: 'POST' | 'PUT' | 'DELETE', corpo?: object) {
  const resposta = await requisitar(metodo === 'PUT' || metodo === 'DELETE' ? `${caminho(estabelecimentoId)}/minha` : caminho(estabelecimentoId), {
    method: metodo,
    headers: {
      'X-CSRF-TOKEN': await tokenCsrf(),
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  })
  return resposta.status === 204 ? undefined : paraAvaliacao(await resposta.json() as AvaliacaoApi)
}

export async function listarAvaliacoes(estabelecimentoId: number): Promise<Avaliacao[]> {
  const resposta = await requisitar(caminho(estabelecimentoId))
  return (await resposta.json() as AvaliacaoApi[]).map(paraAvaliacao)
}

// Formato do backend (`AvaliacaoResumoDTO`); aceita também `quantidade`/`media`, o formato antigo.
type ResumoAvaliacoesResposta = {
  estabelecimentoId?: number
  totalAvaliacoes?: number
  mediaNotas?: number | string
  quantidade?: number
  media?: number | string
}

const numeroOuZero = (valor: unknown) => (Number.isFinite(Number(valor)) ? Number(valor) : 0)

export async function buscarResumoAvaliacoes(estabelecimentoId: number): Promise<ResumoAvaliacoesApi> {
  const resposta = await requisitar(`${caminho(estabelecimentoId)}/resumo`)
  const resumo: ResumoAvaliacoesResposta = await resposta.json()
  return {
    quantidade: numeroOuZero(resumo.totalAvaliacoes ?? resumo.quantidade),
    media: numeroOuZero(resumo.mediaNotas ?? resumo.media),
  }
}

export function publicarAvaliacaoApi(estabelecimentoId: number, comentario: string, estrelas: number) {
  return enviar(estabelecimentoId, 'POST', { comentario: comentario.trim(), nota: estrelas })
}

export function editarAvaliacaoApi(estabelecimentoId: number, comentario: string, estrelas: number) {
  return enviar(estabelecimentoId, 'PUT', { comentario: comentario.trim(), nota: estrelas })
}

export function excluirAvaliacaoApi(estabelecimentoId: number) {
  return enviar(estabelecimentoId, 'DELETE')
}
