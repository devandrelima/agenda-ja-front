import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextoAutenticacao } from '../src/app/authState'
import { Dashboard } from '../src/features/provider/Provider'

const sessao = {
  id: 1,
  nome: 'Ana Gestora',
  email: 'ana@aurora.com',
  role: 'GESTOR',
  estabelecimentoId: 4,
}

const reserva = (campos: Record<string, unknown>) => ({
  id: 1,
  clienteNome: 'Marina Souza',
  servicoNome: 'Corte',
  profissionalId: 1,
  profissionalNome: 'Ana Martins',
  dataHoraInicio: '2026-11-11T16:00:00',
  dataHoraFim: '2026-11-11T17:00:00',
  status: 'CONFIRMADO',
  ...campos,
})

const servicos = [
  { id: 10, nome: 'Corte', duracaoMinutos: 60, valor: 50, estabelecimentoId: 4 },
  { id: 11, nome: 'Escova', duracaoMinutos: 45, valor: 40, estabelecimentoId: 4 },
]

function resposta(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type Rotas = Record<string, (opcoes?: RequestInit, url?: URL) => Response>

function stubFetch(rotas: Rotas) {
  const requisicoes = vi.fn(async (caminho: string, opcoes?: RequestInit) => {
    const url = new URL(caminho, 'http://localhost')
    const rota = rotas[`${opcoes?.method ?? 'GET'} ${url.pathname}`]
    if (!rota) throw new Error(`Rota inesperada: ${opcoes?.method ?? 'GET'} ${url.pathname}`)
    return rota(opcoes, url)
  })
  vi.stubGlobal('fetch', requisicoes)
  return requisicoes
}

const base = '/api/admin/estabelecimentos/4'

function rotasPadrao(lista: unknown[]): Rotas {
  return {
    [`GET ${base}/agenda`]: () => resposta(lista),
    [`GET ${base}/servicos`]: () => resposta(servicos),
  }
}

const listaDeExemplo = [
  reserva({ id: 1 }),
  reserva({
    id: 2,
    clienteNome: 'Paula Reis',
    servicoNome: 'Escova',
    status: 'AGUARDANDO_CONFIRMACAO',
    dataHoraInicio: '2026-11-12T10:00:00',
    dataHoraFim: '2026-11-12T10:45:00',
  }),
  reserva({ id: 3, clienteNome: 'Luana Costa', status: 'CANCELADO' }),
]

function renderizar() {
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

const metrica = (nome: string) =>
  screen.getAllByText(nome).find((item) => item.matches('.metric .muted'))!.parentElement!

describe('página inicial do painel', () => {
  beforeEach(() => {
    // Quarta-feira, 11/11/2026.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-11T15:00:00Z') })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('consulta hoje e os próximos 7 dias', async () => {
    const requisicoes = stubFetch(rotasPadrao([]))
    renderizar()
    await screen.findByText('Nenhum atendimento nos próximos 7 dias.')
    const [caminho] = requisicoes.mock.calls.find(([url]) => String(url).includes('/agenda'))!
    const url = new URL(String(caminho), 'http://localhost')
    expect(url.searchParams.get('inicio')).toBe('2026-11-11T00:00:00')
    expect(url.searchParams.get('fim')).toBe('2026-11-18T23:59:59')
  })

  it('mostra os indicadores e os próximos atendimentos vindos da API', async () => {
    stubFetch(rotasPadrao(listaDeExemplo))
    renderizar()
    expect(await screen.findByText('Marina Souza')).toBeInTheDocument()
    expect(metrica('Agendamentos hoje')).toHaveTextContent('1')
    expect(metrica('Confirmados')).toHaveTextContent('1')
    expect(metrica('Aguardando confirmação')).toHaveTextContent('1')
    expect(metrica('Faturamento previsto').textContent).toMatch(/R\$\s?50,00/)

    const itens = screen.getAllByRole('button').filter((item) => item.matches('.appointment'))
    expect(itens).toHaveLength(2)
    expect(within(itens[0]).getByText('16:00')).toBeInTheDocument()
    expect(within(itens[0]).getByText(/Corte · Ana Martins · hoje/)).toBeInTheDocument()
    expect(within(itens[1]).getByText(/Escova · Ana Martins · qui\. 12/)).toBeInTheDocument()
    expect(within(itens[1]).getByText('Aguardando confirmação')).toBeInTheDocument()
    expect(screen.queryByText('Luana Costa')).not.toBeInTheDocument()
  })

  it('mostra traço no faturamento se os serviços não carregam, sem esconder o resto', async () => {
    stubFetch({
      ...rotasPadrao(listaDeExemplo),
      [`GET ${base}/servicos`]: () => resposta({ mensagem: 'Erro.' }, 500),
    })
    renderizar()
    expect(await screen.findByText('Marina Souza')).toBeInTheDocument()
    expect(metrica('Faturamento previsto')).toHaveTextContent('—')
    expect(metrica('Confirmados')).toHaveTextContent('1')
  })

  it('avisa e permite tentar de novo quando a agenda falha', async () => {
    let falhar = true
    stubFetch({
      ...rotasPadrao([]),
      [`GET ${base}/agenda`]: () =>
        falhar ? resposta({ mensagem: 'Erro interno.' }, 500) : resposta(listaDeExemplo),
    })
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno.')
    expect(metrica('Confirmados')).toHaveTextContent('—')
    falhar = false
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Marina Souza')).toBeInTheDocument()
  })

  it('abre a reserva, confirma e atualiza os números sem recarregar a página', async () => {
    const user = userEvent.setup()
    let status = 'AGUARDANDO_CONFIRMACAO'
    stubFetch({
      [`GET ${base}/agenda`]: () =>
        resposta([reserva({ id: 7, status }), reserva({ id: 8, clienteNome: 'Paula Reis' })]),
      [`GET ${base}/servicos`]: () => resposta(servicos),
      'GET /api/estabelecimentos/4/agendamentos/7': () =>
        resposta({
          id: 7,
          estabelecimentoNome: 'Aurora',
          servicoNome: 'Corte',
          profissionalNome: 'Ana Martins',
          dataHoraInicio: '2026-11-11T16:00:00',
          dataHoraFim: '2026-11-11T17:00:00',
          status,
          valor: 50,
        }),
      'GET /api/auth/csrf': () => resposta({ token: 'token-teste' }),
      [`PATCH ${base}/agendamentos/7/status`]: (opcoes) => {
        status = JSON.parse(String(opcoes?.body)).status
        return new Response(null, { status: 204 })
      },
    })
    renderizar()
    await screen.findAllByText('Marina Souza')
    expect(metrica('Aguardando confirmação')).toHaveTextContent('1')
    expect(metrica('Confirmados')).toHaveTextContent('1')

    await user.click(screen.getByText('Marina Souza'))
    const modal = await screen.findByRole('dialog')
    await user.click(await within(modal).findByRole('button', { name: 'Confirmar' }))
    expect(await within(modal).findByRole('status')).toHaveTextContent('Reserva confirmada.')

    await vi.waitFor(() => expect(metrica('Confirmados')).toHaveTextContent('2'))
    expect(metrica('Aguardando confirmação')).toHaveTextContent('0')
    expect(screen.queryByText('Carregando atendimentos...')).not.toBeInTheDocument()
  })

  it('abre a reserva pelo teclado', async () => {
    const user = userEvent.setup()
    stubFetch({
      ...rotasPadrao([reserva({ id: 7 })]),
      'GET /api/estabelecimentos/4/agendamentos/7': () => resposta({ mensagem: 'Erro.' }, 500),
    })
    renderizar()
    ;(await screen.findByText('Marina Souza')).closest<HTMLElement>('[role="button"]')!.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})
