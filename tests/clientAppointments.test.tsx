import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it } from 'vitest'
import { DetalheDoAgendamento, MeusAgendamentos } from '../src/features/client/Appointments'
import { EscolherNegocioParaAgendar } from '../src/features/client/BusinessPicker'

afterEach(cleanup)

it('lista reservas do cliente com status e abre os detalhes', () => {
  render(
    <MemoryRouter>
      <MeusAgendamentos />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: 'Seus agendamentos' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /studio marina/i })).toHaveTextContent('Aguardando confirmação')
  expect(screen.getByRole('link', { name: /vivian unhas/i })).toHaveTextContent('Confirmado')
  expect(screen.getByRole('link', { name: /novo agendamento/i })).toHaveAttribute(
    'href',
    '/novo-agendamento',
  )
})

it('separa negócios já agendados e mostra a avaliação ao iniciar novo agendamento', () => {
  render(
    <MemoryRouter>
      <EscolherNegocioParaAgendar />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: 'Já fiz agendamento' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /studio marina/i })).toHaveTextContent('4,8 ★ · 124 comentários')
  expect(screen.getByRole('heading', { name: 'Outros negócios' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /barbearia central/i })).toHaveAttribute(
    'href',
    '/estabelecimento/8e4b93c0-20d2-4baa-b5f2-c0ebf366fc24/agendar',
  )
})

it('permite confirmar uma reserva pendente no detalhe', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/meus-agendamentos/1']}>
      <Routes>
        <Route path="/meus-agendamentos/:agendamentoId" element={<DetalheDoAgendamento />} />
      </Routes>
    </MemoryRouter>,
  )

  expect(screen.getByText('Corte e escova')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Confirmar agendamento' }))
  expect(screen.getByRole('status')).toHaveTextContent('confirmado com sucesso')
  expect(screen.getByText('Confirmado')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /av. rio branco/i })).toHaveAttribute(
    'href',
    expect.stringContaining('google.com/maps/search'),
  )
  expect(screen.getByRole('link', { name: 'Reagendar' })).toHaveAttribute(
    'href',
    '/estabelecimento/f8eb95f4-692a-4a9e-8873-fd0cd2b95311/agendar',
  )
  await user.click(screen.getByRole('button', { name: 'Cancelar reserva' }))
  const dialogo = screen.getByRole('dialog', { name: 'Cancelar reserva?' })
  expect(dialogo).toHaveTextContent(
    'ficarão disponíveis novamente',
  )
  await user.click(within(dialogo).getByRole('button', { name: 'Cancelar reserva' }))
  expect(screen.getByRole('status')).toHaveTextContent('data e o horário foram liberados')
  expect(screen.getByText('Cancelado')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Cancelar reserva' })).not.toBeInTheDocument()
})
