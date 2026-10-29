import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarAgendamento } from '../src/data/agendamentos'
import { ErroApi } from '../src/data/api'

function resposta(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('detalhes do agendamento', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('consulta a reserva pelo estabelecimento e pelo identificador', async () => {
    const detalhes = { id: 31, servicoNome: 'Corte feminino', valor: 75 }
    const requisicoes = vi.fn(async () => resposta(detalhes))
    vi.stubGlobal('fetch', requisicoes)
    await expect(buscarAgendamento(4, 31)).resolves.toEqual(detalhes)
    expect(requisicoes).toHaveBeenCalledWith(
      '/api/estabelecimentos/4/agendamentos/31',
      expect.anything(),
    )
  })

  it('repassa o status quando o acesso é negado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => resposta({ mensagem: 'Sem permissão.' }, 403)),
    )
    await expect(buscarAgendamento(4, 31)).rejects.toMatchObject({ status: 403 })
    await expect(buscarAgendamento(4, 31)).rejects.toBeInstanceOf(ErroApi)
  })
})
