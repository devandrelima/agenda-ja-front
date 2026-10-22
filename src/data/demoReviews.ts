import { useCallback, useSyncExternalStore } from 'react'
import type { Avaliacao } from '../domain/models'
import { repositorioMock } from './mockRepository'

const chaveDemo = 'agendaja-demo-reviews-v1'
const avaliacoesOriginais = repositorioMock.buscarEstabelecimento().avaliacoes
const avaliacoesVazias: Avaliacao[] = []
const ouvintes = new Set<() => void>()
const avaliacoesEmCache = new Map<string, Avaliacao[]>()
let observandoStorage = false

function chaveAvaliacoes(publicId?: string) {
  return publicId ? `${chaveDemo}:${publicId.toLowerCase()}` : chaveDemo
}

function lerCriadas(chave: string): Avaliacao[] {
  try {
    const dados: unknown = JSON.parse(localStorage.getItem(chave) ?? '[]')
    if (!Array.isArray(dados)) return []
    const validas = dados.filter(
      (item): item is Avaliacao =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.autorId === 'number' &&
        typeof item.nomeCliente === 'string' &&
        typeof item.comentario === 'string' &&
        Number.isInteger(item.estrelas) &&
        item.estrelas >= 1 &&
        item.estrelas <= 5,
    )
    const porAutor = new Map<number, Avaliacao>()
    for (const avaliacao of validas) porAutor.set(avaliacao.autorId!, avaliacao)
    return [...porAutor.values()]
  } catch {
    return []
  }
}

function atualizarCache(chave: string) {
  avaliacoesEmCache.set(chave, [
    ...(chave === chaveDemo ? avaliacoesOriginais : []),
    ...lerCriadas(chave),
  ])
  ouvintes.forEach((ouvinte) => ouvinte())
}

function observarAlteracoes() {
  if (observandoStorage) return
  window.addEventListener('storage', (evento) => {
    if (evento.key?.startsWith(chaveDemo)) atualizarCache(evento.key)
  })
  observandoStorage = true
}

function inscrever(ouvinte: () => void) {
  observarAlteracoes()
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

function obterSnapshot(chave: string) {
  if (!avaliacoesEmCache.has(chave))
    avaliacoesEmCache.set(chave, [
      ...(chave === chaveDemo ? avaliacoesOriginais : []),
      ...lerCriadas(chave),
    ])
  return avaliacoesEmCache.get(chave)!
}

function salvar(chave: string, criadas: Avaliacao[]) {
  localStorage.setItem(chave, JSON.stringify(criadas))
  atualizarCache(chave)
}

function criarId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function useAvaliacoesDemo(publicId?: string) {
  const chave = chaveAvaliacoes(publicId)
  const snapshot = useCallback(() => obterSnapshot(chave), [chave])
  const snapshotServidor = useCallback(
    () => (chave === chaveDemo ? avaliacoesOriginais : avaliacoesVazias),
    [chave],
  )
  return useSyncExternalStore(inscrever, snapshot, snapshotServidor)
}

export function resumoAvaliacoes(avaliacoes: Avaliacao[]) {
  const quantidade = avaliacoes.length
  const media = quantidade
    ? Math.round(
        (avaliacoes.reduce((soma, avaliacao) => soma + avaliacao.estrelas, 0) / quantidade) * 10,
      ) / 10
    : 0
  return { quantidade, media }
}

export async function publicarAvaliacao(
  autor: { id: number; nome: string },
  comentario: string,
  estrelas: number,
  publicId?: string,
) {
  if (!comentario.trim() || !Number.isInteger(estrelas) || estrelas < 1 || estrelas > 5)
    throw new Error('Escreva um comentário e selecione de 1 a 5 estrelas.')
  const chave = chaveAvaliacoes(publicId)
  const criadas = lerCriadas(chave)
  if (criadas.some((avaliacao) => avaliacao.autorId === autor.id))
    throw new Error('Você já publicou uma avaliação. Edite seu comentário para alterá-lo.')
  const avaliacao: Avaliacao = {
    id: criarId(),
    autorId: autor.id,
    nomeCliente: autor.nome,
    comentario: comentario.trim(),
    estrelas,
    publicadoEm: new Date().toISOString(),
  }
  salvar(chave, [...criadas, avaliacao])
  return avaliacao
}

export async function editarAvaliacao(
  id: string,
  autorId: number,
  comentario: string,
  estrelas: number,
  publicId?: string,
) {
  if (!comentario.trim() || !Number.isInteger(estrelas) || estrelas < 1 || estrelas > 5)
    throw new Error('Escreva um comentário e selecione de 1 a 5 estrelas.')
  const chave = chaveAvaliacoes(publicId)
  const criadas = lerCriadas(chave)
  const indice = criadas.findIndex(
    (avaliacao) => avaliacao.id === id && avaliacao.autorId === autorId,
  )
  if (indice < 0) throw new Error('Você não pode editar este comentário.')
  const atualizadas = [...criadas]
  atualizadas[indice] = {
    ...criadas[indice],
    comentario: comentario.trim(),
    estrelas,
    editadoEm: new Date().toISOString(),
  }
  salvar(chave, atualizadas)
  return atualizadas[indice]
}

export async function excluirAvaliacao(id: string, autorId: number, publicId?: string) {
  const chave = chaveAvaliacoes(publicId)
  const criadas = lerCriadas(chave)
  const indice = criadas.findIndex(
    (avaliacao) => avaliacao.id === id && avaliacao.autorId === autorId,
  )
  if (indice < 0) throw new Error('Você não pode excluir este comentário.')
  salvar(
    chave,
    criadas.filter((avaliacao) => avaliacao.id !== id),
  )
}
