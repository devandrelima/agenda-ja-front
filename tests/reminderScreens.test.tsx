import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { ContextoAutenticacao } from '../src/app/authState'
import { criarFonteApi } from '../src/data/agendamentos'
import { PaginaConfirmacaoPublica } from '../src/features/booking/PublicEstablishment'
import { DetalheDoAgendamento } from '../src/features/client/Appointments'
import { DetalhesDaReserva } from '../src/features/provider/ReservaDetalhes'

const publicId = 'f8eb95f4-692a-4a9e-8873-fd0cd2b95311'

/** Início daqui a `dias` dias, às 14h, no formato local sem fuso do backend. */
function inicioEm(dias: number) {
  const data = new Date()
  data.setDate(data.getDate() + dias)
  const dois = (n: number) => String(n).padStart(2, '0')
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}T14:00:00`
}

const detalhes = (status: string, extra = {}) => ({
  id: 31,
  estabelecimentoNome: 'Estúdio Brisa',
  servicoNome: 'Corte feminino',
  profissionalNome: 'Lucas Mendes',
  dataHoraInicio: inicioEm(5),
  dataHoraFim: inicioEm(5).replace('14:00', '15:00'),
  status,
  valor: 75,
  ...extra,
})

const sessaoCliente = {
  id: 9,
  nome: 'Ana Souza',
  email: 'ana@exemplo.com',
  role: 'CLIENTE',
  estabelecimentoId: null,
}

function json(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json' } })
}

function comSessao(elemento: React.ReactNode) {
  return (
    <ContextoAutenticacao.Provider
      value={{ sessao: sessaoCliente, carregando: false, autenticar: vi.fn(), encerrar: vi.fn() }}
    >
      {elemento}
    </ContextoAutenticacao.Provider>
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('informa o lembrete e o e-mail do cliente na confirmação do agendamento', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (caminho: string) =>
      caminho === `/api/estabelecimentos/publico/${publicId}`
        ? json({ id: 4, publicId, nome: 'Estúdio Brisa', categoria: '', localizacao: '' })
        : json(detalhes('CONFIRMADO')),
    ),
  )
  render(
    comSessao(
      <MemoryRouter initialEntries={[`/estabelecimento/${publicId}/agendamentos/31`]}>
        <Routes>
          <Route
            path="/estabelecimento/:estabelecimentoId/agendamentos/:agendamentoId"
            element={<PaginaConfirmacaoPublica />}
          />
        </Routes>
      </MemoryRouter>,
    ),
  )
  expect(await screen.findByRole('note')).toHaveTextContent(
    /Você receberá um lembrete por e-mail \(ana@exemplo\.com\) na véspera, \d{2}\/\d{2}, às 8h\./,
  )
})

it('mostra o lembrete no detalhe do cliente e o omite para reservas canceladas', async () => {
  const reserva = (status: string) => ({
    id: 1,
    estabelecimentoId: 4,
    estabelecimentoPublicId: publicId,
    estabelecimentoNome: 'Studio Marina',
    estabelecimentoLocalizacao: 'Centro',
    servicoNome: 'Escova',
    profissionalNome: 'Ana',
    dataHoraInicio: inicioEm(5),
    dataHoraFim: inicioEm(5).replace('14:00', '15:00'),
    status,
    valor: 55,
  })
  const renderizar = () =>
    render(
      comSessao(
        <MemoryRouter initialEntries={['/meus-agendamentos/1']}>
          <Routes>
            <Route path="/meus-agendamentos/:agendamentoId" element={<DetalheDoAgendamento />} />
          </Routes>
        </MemoryRouter>,
      ),
    )

  vi.stubGlobal('fetch', vi.fn(async () => json(reserva('AGUARDANDO_CONFIRMACAO'))))
  renderizar()
  expect(await screen.findByRole('note')).toHaveTextContent(/lembrete por e-mail \(ana@exemplo\.com\)/)
  cleanup()

  vi.stubGlobal('fetch', vi.fn(async () => json(reserva('CANCELADO'))))
  renderizar()
  expect(await screen.findByRole('note')).toHaveTextContent('Reservas canceladas não recebem lembrete.')
})

it('informa ao gestor o lembrete previsto para a reserva', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => json(detalhes('CONFIRMADO'))))
  render(<DetalhesDaReserva fonte={criarFonteApi(4, 31)} aoFechar={() => {}} />)

  await screen.findByText('Corte feminino')
  expect(screen.getByRole('note')).toHaveTextContent('O cliente receberá um lembrete por e-mail na véspera')
})
