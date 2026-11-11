import { cleanup, render, screen, within } from '@testing-library/react'
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

const negocios = [
  {
    id: 4,
    publicId: reservaPendente.estabelecimentoPublicId,
    nome: 'Studio Marina',
    categoria: 'Salão de beleza',
    localizacao: 'Av. Rio Branco, 214, Centro',
    imagemUrl: '/assets/negocios/capa-salao.png',
    logoUrl: '/assets/negocios/logo-salao.svg',
    mediaAvaliacoes: 4.8,
    quantidadeAvaliacoes: 124,
  },
  {
    id: 8,
    publicId: '8e4b93c0-20d2-4baa-b5f2-c0ebf366fc24',
    nome: 'Barbearia Central',
    categoria: 'Barbearia',
    localizacao: 'Centro, Fortaleza - CE',
    imagemUrl: '/assets/negocios/capa-barbearia.png',
    logoUrl: '/assets/negocios/logo-barbearia.svg',
    mediaAvaliacoes: 0,
    quantidadeAvaliacoes: 0,
  },
]

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
    if (caminho === '/api/estabelecimentos/publico') return resposta(negocios)
    if (caminho === '/api/clientes/me/agendamentos/1') return resposta(reservaPendente)
    if (caminho === '/api/clientes/me/agendamentos/1/confirmacao')
      return resposta({ ...reservaPendente, status: 'CONFIRMADO' })
    if (caminho === '/api/clientes/me/agendamentos/1/cancelamento')
      return resposta({ ...reservaPendente, status: 'CANCELADO' })
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

  // O título aparece durante o carregamento; os links só depois que a lista chega.
  expect(await screen.findByRole('heading', { name: 'Seus agendamentos' })).toBeInTheDocument()
  expect(await screen.findByRole('link', { name: /studio marina/i })).toHaveTextContent(
    'Aguardando confirmação',
  )
  expect(screen.getByRole('link', { name: /vivian unhas/i })).toHaveTextContent('Confirmado')
  expect(screen.getByRole('link', { name: /novo agendamento/i })).toHaveAttribute(
    'href',
    '/novo-agendamento',
  )
})

it('separa negócios já agendados com base na lista da HU18 e permite buscar pelo nome', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <EscolherNegocioParaAgendar />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: 'Já fiz agendamento' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /studio marina/i })).toHaveTextContent('Av. Rio Branco, 214, Centro')
  expect(screen.getByRole('heading', { name: 'Outros negócios' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /barbearia central/i })).toHaveAttribute(
    'href',
    '/estabelecimento/8e4b93c0-20d2-4baa-b5f2-c0ebf366fc24',
  )
  await user.type(screen.getByRole('searchbox', { name: 'Buscar negócio' }), 'BaR')
  expect(screen.getByRole('link', { name: /barbearia central/i })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /studio marina/i })).not.toBeInTheDocument()
})

it('confirma e cancela uma reserva pendente pelas HUs 18 e 19', async () => {
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
  expect(screen.getByRole('link', { name: 'Reagendar' })).toHaveAttribute(
    'href',
    '/estabelecimento/f8eb95f4-692a-4a9e-8873-fd0cd2b95311/agendar',
  )
  await user.click(screen.getByRole('button', { name: 'Cancelar reserva' }))
  const dialogo = screen.getByRole('dialog', { name: 'Cancelar reserva?' })
  expect(dialogo).toHaveTextContent('ficarão disponíveis novamente')
  await user.click(within(dialogo).getByRole('button', { name: 'Cancelar reserva' }))
  expect(await screen.findByRole('status')).toHaveTextContent('data e o horário foram liberados')
  expect(screen.getByText('Cancelado')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Cancelar reserva' })).not.toBeInTheDocument()
  expect(globalThis.fetch).toHaveBeenCalledWith(
    '/api/clientes/me/agendamentos/1/confirmacao',
    expect.objectContaining({ method: 'POST', headers: { 'X-CSRF-TOKEN': 'csrf' } }),
  )
  expect(globalThis.fetch).toHaveBeenCalledWith(
    '/api/clientes/me/agendamentos/1/cancelamento',
    expect.objectContaining({ method: 'POST', headers: { 'X-CSRF-TOKEN': 'csrf' } }),
  )
})
