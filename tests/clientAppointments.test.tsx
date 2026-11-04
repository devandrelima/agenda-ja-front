import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { DetalheDoAgendamento, MeusAgendamentos } from '../src/features/client/Appointments'
import { EscolherNegocioParaAgendar } from '../src/features/client/BusinessPicker'

const reservaPendente = {
  id: 1,
  estabelecimentoId: 4,
  estabelecimentoPublicId: 'f8eb95f4-692a-4a9e-8873-fd0cd2b95311',
  estabelecimentoNome: 'Studio Marina',
  estabelecimentoLocalizacao: 'Av. Rio Branco, 214, Centro',
  servicoId: 7,
  servicoNome: 'Corte e escova',
  profissionalId: 3,
  profissionalNome: 'Marina Souza',
  dataHoraInicio: '2026-11-07T14:00:00',
  dataHoraFim: '2026-11-07T15:00:00',
  status: 'AGUARDANDO_CONFIRMACAO',
  valor: 75,
}

const reservaConfirmada = {
  ...reservaPendente,
  id: 2,
  estabelecimentoNome: 'Vivian Unhas',
  status: 'CONFIRMADO',
}

function resposta(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (entrada: RequestInfo | URL) => {
    const caminho = String(entrada)
    if (caminho === '/api/auth/csrf') return resposta({ token: 'csrf' })
    if (caminho === '/api/clientes/me/agendamentos')
      return resposta([reservaPendente, reservaConfirmada])
    if (caminho === '/api/clientes/me/agendamentos/1') return resposta(reservaPendente)
    if (caminho === '/api/clientes/me/agendamentos/1/confirmacao')
      return resposta({ ...reservaPendente, status: 'CONFIRMADO' })
    return resposta({ mensagem: 'Rota não esperada.' }, 404)
  }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('lista reservas do cliente retornadas pela HU18', async () => {
  render(
    <MemoryRouter>
      <MeusAgendamentos />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: 'Seus agendamentos' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /studio marina/i })).toHaveTextContent('Aguardando confirmação')
  expect(screen.getByRole('link', { name: /vivian unhas/i })).toHaveTextContent('Confirmado')
  expect(screen.getByRole('link', { name: /novo agendamento/i })).toHaveAttribute(
    'href',
    '/novo-agendamento',
  )
})

it('separa negócios já agendados com base na lista da HU18', async () => {
  render(
    <MemoryRouter>
      <EscolherNegocioParaAgendar />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: 'Já fiz agendamento' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /studio marina/i })).toHaveTextContent('4,8 ★ · 124 comentários')
  expect(screen.getByRole('heading', { name: 'Outros negócios' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /barbearia central/i })).toHaveAttribute(
    'href',
    '/estabelecimento/8e4b93c0-20d2-4baa-b5f2-c0ebf366fc24/agendar',
  )
})

it('confirma uma reserva pendente pela HU18', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/meus-agendamentos/1']}>
      <Routes>
        <Route path="/meus-agendamentos/:agendamentoId" element={<DetalheDoAgendamento />} />
      </Routes>
    </MemoryRouter>,
  )

  expect(await screen.findByText('Corte e escova')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Confirmar agendamento' }))
  expect(await screen.findByRole('status')).toHaveTextContent('confirmado com sucesso')
  expect(screen.getByText('Confirmado')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /av. rio branco/i })).toHaveAttribute(
    'href',
    expect.stringContaining('google.com/maps/search'),
  )
  expect(screen.getByText('Cancelamento e reagendamento estarão disponíveis em breve.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Cancelar reserva' })).not.toBeInTheDocument()
  expect(globalThis.fetch).toHaveBeenCalledWith(
    '/api/clientes/me/agendamentos/1/confirmacao',
    expect.objectContaining({ method: 'POST', headers: { 'X-CSRF-TOKEN': 'csrf' } }),
  )
})
