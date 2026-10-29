import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarResumoAvaliacoes } from '../src/data/reviews'

function resposta(dados: unknown) {
  return new Response(JSON.stringify(dados), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('resumo de avaliações da API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('converte totalAvaliacoes e mediaNotas para quantidade e media', async () => {
    const requisicoes = vi.fn(async () =>
      resposta({ estabelecimentoId: 2, totalAvaliacoes: 12, mediaNotas: 4.3 }),
    )
    vi.stubGlobal('fetch', requisicoes)
    await expect(buscarResumoAvaliacoes(2)).resolves.toEqual({ quantidade: 12, media: 4.3 })
    expect(requisicoes).toHaveBeenCalledWith(
      '/api/estabelecimentos/2/avaliacoes/resumo',
      expect.anything(),
    )
  })

  it('também aceita o formato antigo com quantidade e media', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => resposta({ quantidade: 3, media: 4 })),
    )
    await expect(buscarResumoAvaliacoes(2)).resolves.toEqual({ quantidade: 3, media: 4 })
  })

  it('nunca devolve undefined nem NaN quando a resposta vem incompleta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => resposta({ estabelecimentoId: 2 })),
    )
    await expect(buscarResumoAvaliacoes(2)).resolves.toEqual({ quantidade: 0, media: 0 })
  })

  it('devolve zeros para um estabelecimento sem avaliações', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => resposta({ estabelecimentoId: 2, totalAvaliacoes: 0, mediaNotas: 0.0 })),
    )
    await expect(buscarResumoAvaliacoes(2)).resolves.toEqual({ quantidade: 0, media: 0 })
  })
})
