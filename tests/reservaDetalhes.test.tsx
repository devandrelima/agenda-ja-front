import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DetalhesDaReserva } from '../src/features/provider/ReservaDetalhes'

const reserva = {
  id: 31,
  estabelecimentoNome: 'Ateliê Aurora',
  servicoNome: 'Corte feminino',
  profissionalNome: 'Ana Martins',
  dataHoraInicio: '2026-11-03T14:00:00',
  dataHoraFim: '2026-11-03T15:00:00',
  status: 'AGUARDANDO_CONFIRMACAO',
  valor: 75,
}

function resposta(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('detalhes da reserva no painel', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('mostra serviço, profissional, horário, valor e status da reserva', async () => {
    const requisicoes = vi.fn(async () => resposta(reserva))
    vi.stubGlobal('fetch', requisicoes)
    render(<DetalhesDaReserva estabelecimentoId={4} agendamentoId={31} aoFechar={() => {}} />)

    expect(await screen.findByText('Corte feminino')).toBeInTheDocument()
    expect(screen.getByText('Ana Martins')).toBeInTheDocument()
    expect(screen.getByText('14:00 às 15:00')).toBeInTheDocument()
    expect(screen.getByText(/75,00/)).toBeInTheDocument()
    expect(screen.getByText('Aguardando confirmação')).toBeInTheDocument()
    expect(requisicoes).toHaveBeenCalledWith(
      '/api/estabelecimentos/4/agendamentos/31',
      expect.anything(),
    )
  })

  it('mostra o erro e permite tentar novamente', async () => {
    const user = userEvent.setup()
    const requisicoes = vi
      .fn()
      .mockResolvedValueOnce(resposta({}, 404))
      .mockResolvedValueOnce(resposta(reserva))
    vi.stubGlobal('fetch', requisicoes)
    render(<DetalhesDaReserva estabelecimentoId={4} agendamentoId={31} aoFechar={() => {}} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Reserva não encontrada.')
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Corte feminino')).toBeInTheDocument()
  })

  it('fecha pelo botão e pela tecla Esc', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async () => resposta(reserva)))
    const aoFechar = vi.fn()
    render(<DetalhesDaReserva estabelecimentoId={4} agendamentoId={31} aoFechar={aoFechar} />)

    await user.click(await screen.findByRole('button', { name: 'Fechar' }))
    await user.keyboard('{Escape}')
    expect(aoFechar).toHaveBeenCalledTimes(2)
  })
})
