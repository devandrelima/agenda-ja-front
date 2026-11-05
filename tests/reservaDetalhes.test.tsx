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
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => resposta(reserva)),
    )
    const aoFechar = vi.fn()
    render(<DetalhesDaReserva estabelecimentoId={4} agendamentoId={31} aoFechar={aoFechar} />)

    await user.click(await screen.findByRole('button', { name: 'Fechar' }))
    await user.keyboard('{Escape}')
    expect(aoFechar).toHaveBeenCalledTimes(2)
  })
})

describe('ações sobre a reserva', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  function simular(statusInicial: string, statusFinal: string, respostaPatch = 204) {
    let atual = statusInicial
    const requisicoes = vi.fn(async (caminho: string, opcoes?: RequestInit) => {
      if (caminho === '/api/auth/csrf') return resposta({ token: 'csrf' })
      if (opcoes?.method === 'PATCH') {
        if (respostaPatch === 204) atual = statusFinal
        return respostaPatch === 204
          ? new Response(null, { status: 204 })
          : resposta({}, respostaPatch)
      }
      return resposta({ ...reserva, status: atual })
    })
    vi.stubGlobal('fetch', requisicoes)
    return requisicoes
  }

  const patch = (requisicoes: ReturnType<typeof simular>) =>
    requisicoes.mock.calls.find(([, opcoes]) => opcoes?.method === 'PATCH')

  it('confirma a reserva, avisa e recarrega o status', async () => {
    const user = userEvent.setup()
    const requisicoes = simular('AGUARDANDO_CONFIRMACAO', 'CONFIRMADO')
    const aoAtualizar = vi.fn()
    render(
      <DetalhesDaReserva
        estabelecimentoId={4}
        agendamentoId={31}
        aoFechar={() => {}}
        aoAtualizar={aoAtualizar}
      />,
    )

    await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Reserva confirmada.')
    expect(await screen.findByText('Confirmado')).toBeInTheDocument()
    expect(aoAtualizar).toHaveBeenCalledOnce()
    const [caminho, opcoes] = patch(requisicoes)!
    expect(caminho).toBe('/api/admin/estabelecimentos/4/agendamentos/31/status')
    expect(opcoes).toMatchObject({
      headers: { 'X-CSRF-TOKEN': 'csrf' },
      body: JSON.stringify({ status: 'CONFIRMADO' }),
    })
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Concluir' })).toBeInTheDocument()
  })

  it('pede confirmação antes de cancelar', async () => {
    const user = userEvent.setup()
    const requisicoes = simular('CONFIRMADO', 'CANCELADO')
    render(<DetalhesDaReserva estabelecimentoId={4} agendamentoId={31} aoFechar={() => {}} />)

    await user.click(await screen.findByRole('button', { name: 'Cancelar reserva' }))
    expect(patch(requisicoes)).toBeUndefined()
    await user.click(screen.getByRole('button', { name: 'Sim, cancelar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Reserva cancelada.')
    expect(await screen.findByText('Cancelado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Concluir' })).not.toBeInTheDocument()
  })

  it('explica a recusa do backend e mantém o aviso de erro', async () => {
    const user = userEvent.setup()
    const aoAtualizar = vi.fn()
    simular('AGUARDANDO_CONFIRMACAO', 'CONFIRMADO', 400)
    render(
      <DetalhesDaReserva
        estabelecimentoId={4}
        agendamentoId={31}
        aoFechar={() => {}}
        aoAtualizar={aoAtualizar}
      />,
    )

    await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esta ação não é permitida para o status atual da reserva.',
    )
    expect(aoAtualizar).not.toHaveBeenCalled()
  })

  it('não oferece ações para reservas concluídas', async () => {
    simular('CONCLUIDO', 'CONCLUIDO')
    render(<DetalhesDaReserva estabelecimentoId={4} agendamentoId={31} aoFechar={() => {}} />)

    expect(await screen.findByText('Concluído')).toBeInTheDocument()
    expect(screen.getAllByRole('button').map((botao) => botao.textContent)).toEqual(['Fechar'])
  })
})
