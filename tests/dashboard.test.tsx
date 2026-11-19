import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextoAutenticacao } from '../src/app/authState'
import { Dashboard } from '../src/features/provider/Provider'

const sessao = { id: 1, nome: 'Ana Gestora', email: 'ana@aurora.com', role: 'GESTOR', estabelecimentoId: 4 }
const base = '/api/admin/estabelecimentos/4/dashboard'
const resposta = (dados: unknown, status = 200) => new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json' } })

function renderizar() {
  render(<MemoryRouter><ContextoAutenticacao.Provider value={{ sessao, carregando: false, autenticar: vi.fn(), encerrar: vi.fn() }}><Dashboard /></ContextoAutenticacao.Provider></MemoryRouter>)
}

const metrica = (nome: string) => screen.getAllByText(nome).find((item) => item.matches('.metric .muted'))!.parentElement!

describe('dashboard administrativo', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-11T15:00:00Z') }))
  afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

  it('consulta o resumo do dia e mostra os indicadores e próximos atendimentos', async () => {
    const requisicoes = vi.fn(async (caminho: string) => {
      const url = new URL(caminho, 'http://localhost')
      if (url.pathname !== base) throw new Error(`Rota inesperada: ${url.pathname}`)
      return resposta({ data: '2026-11-11', totalReservas: 3, confirmados: 1, pendentes: 1, cancelados: 1, concluidos: 0, faturamentoPrevisto: 50, proximosAtendimentos: [{ agendamentoId: 7, horarioInicio: '2026-11-11T16:00:00', clienteNome: 'Marina Souza', servicoNome: 'Corte', profissionalNome: 'Ana Martins', status: 'CONFIRMADO', valorPrevisto: 50 }] })
    })
    vi.stubGlobal('fetch', requisicoes)
    renderizar()
    expect(await screen.findByText('Marina Souza')).toBeInTheDocument()
    expect(metrica('Agendamentos hoje')).toHaveTextContent('3')
    expect(metrica('Confirmados')).toHaveTextContent('1')
    expect(metrica('Aguardando confirmação')).toHaveTextContent('1')
    expect(metrica('Faturamento previsto')).toHaveTextContent(/R\$\s?50,00/)
    const [caminho] = requisicoes.mock.calls[0]
    expect(new URL(caminho, 'http://localhost').searchParams.get('data')).toBe('2026-11-11')
    expect(within(screen.getByRole('button', { name: /marina souza/i })).getByText('16:00')).toBeInTheDocument()
  })

  it('informa falha e permite tentar novamente', async () => {
    let falhar = true
    vi.stubGlobal('fetch', async () => falhar ? resposta({ mensagem: 'Erro interno.' }, 500) : resposta({ data: '2026-11-11', totalReservas: 0, confirmados: 0, pendentes: 0, cancelados: 0, concluidos: 0, faturamentoPrevisto: 0, proximosAtendimentos: [] }))
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno.')
    falhar = false
    await screen.getByRole('button', { name: 'Tentar novamente' }).click()
    expect(await screen.findByText('Nenhum atendimento previsto para hoje.')).toBeInTheDocument()
  })
})
