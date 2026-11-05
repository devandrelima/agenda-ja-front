import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContextoAutenticacao } from '../src/app/authState'
import { ErroApi } from '../src/data/api'
import { criarFonteMock } from '../src/data/mockReserva'
import { repositorioMock } from '../src/data/mockRepository'
import { paraChaveData } from '../src/domain/availability'
import { Agenda, Dashboard } from '../src/features/provider/Provider'

const sessao = {
  id: 1,
  nome: 'Ana Gestora',
  email: 'a@a.com',
  role: 'GESTOR',
  estabelecimentoId: null,
}

function renderizarDashboard() {
  render(
    <MemoryRouter>
      <ContextoAutenticacao.Provider
        value={{ sessao, carregando: false, autenticar: vi.fn(), encerrar: vi.fn() }}
      >
        <Dashboard />
      </ContextoAutenticacao.Provider>
    </MemoryRouter>,
  )
}

/** Primeira data dos próximos dias em que a profissional da reserva tem horários livres. */
async function dataComHorarios(idAgendamento: string) {
  const fonte = criarFonteMock(idAgendamento)
  const reserva = await fonte.buscar()
  for (let dias = 3; dias < 14; dias++) {
    const data = new Date()
    data.setDate(data.getDate() + dias)
    const chave = paraChaveData(data)
    const horarios = await fonte.listarHorarios(reserva, chave)
    if (horarios.length) return { fonte, chave, horarios }
  }
  throw new Error('Sem horários livres')
}

describe('fonte mock da reserva', () => {
  it('descreve a reserva com o mesmo formato da API', async () => {
    const reserva = await criarFonteMock('a1').buscar()
    expect(reserva).toMatchObject({
      servicoNome: 'Corte feminino',
      profissionalNome: 'Ana Martins',
      status: 'CONFIRMADO',
    })
    expect(new Date(reserva.dataHoraFim) > new Date(reserva.dataHoraInicio)).toBe(true)
  })

  it('recusa transições que o backend também recusa', async () => {
    const fonte = criarFonteMock('a3')
    await fonte.alterarStatus('CANCELADO')
    await expect(fonte.alterarStatus('CONFIRMADO')).rejects.toMatchObject({ status: 400 })
    await expect(fonte.reagendar('2099-01-01', '10:00')).rejects.toBeInstanceOf(ErroApi)
  })

  it('reagenda para um horário livre e recusa um ocupado', async () => {
    const { fonte, chave, horarios } = await dataComHorarios('a2')
    await fonte.reagendar(chave, horarios[0])
    expect((await fonte.buscar()).dataHoraInicio).toBe(`${chave}T${horarios[0]}:00`)

    // A reserva a1 é da mesma profissional: o horário dela passa a estar ocupado para a2.
    const a1 = repositorioMock.buscarAgendamentos().find((item) => item.id === 'a1')!
    const [dataA1, horaA1] = [a1.inicio.slice(0, 10), a1.inicio.slice(11, 16)]
    await expect(fonte.reagendar(dataA1, horaA1)).rejects.toMatchObject({ status: 409 })
  })
})

describe('modal de demonstração nas telas mockadas', () => {
  afterEach(cleanup)

  it('abre ao clicar em um agendamento da agenda e confirma a reserva', async () => {
    const user = userEvent.setup()
    render(<Agenda />)

    await user.click(screen.getByText('Luana Costa'))
    const modal = await screen.findByRole('dialog')
    expect(within(modal).getByText(/Exemplo de demonstração/)).toBeInTheDocument()
    expect(await within(modal).findByText('Escova')).toBeInTheDocument()
    expect(within(modal).getByText('Aguardando confirmação')).toBeInTheDocument()

    await user.click(within(modal).getByRole('button', { name: 'Confirmar' }))
    expect(await within(modal).findByRole('status')).toHaveTextContent('Reserva confirmada.')
    expect(await within(modal).findByText('Confirmado')).toBeInTheDocument()
  })

  it('abre pelo teclado e fecha com Esc', async () => {
    const user = userEvent.setup()
    render(<Agenda />)

    screen.getByText('Paula Reis').closest<HTMLElement>('[role="button"]')!.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('abre pela página inicial e atualiza os números depois de concluir', async () => {
    const user = userEvent.setup()
    renderizarDashboard()
    const confirmados = () => screen.getByText('Confirmados').parentElement!
    expect(confirmados()).toHaveTextContent('2')

    await user.click(screen.getByText('Marina Souza'))
    const modal = await screen.findByRole('dialog')
    await user.click(await within(modal).findByRole('button', { name: 'Concluir' }))
    await within(modal).findByText('Reserva concluída.')
    await user.click(within(modal).getByRole('button', { name: 'Fechar' }))

    expect(confirmados()).toHaveTextContent('1')
    expect(screen.getByText('Concluído')).toBeInTheDocument()
  })
})
