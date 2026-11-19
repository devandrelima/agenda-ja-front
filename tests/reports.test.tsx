import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContextoAutenticacao } from '../src/app/authState'
import { Relatorios } from '../src/features/provider/Reports'

const sessao = { id: 1, nome: 'Ana Gestora', email: 'ana@aurora.com', role: 'GESTOR', estabelecimentoId: 4 }

describe('relatórios operacionais', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })

  it('consulta o período e apresenta indicadores e serviços populares', async () => {
    const fetchMock = vi.fn(async (caminho: RequestInfo | URL) => {
      void caminho
      return new Response(JSON.stringify({
      dataInicio: '2026-11-01', dataFim: '2026-11-19', totalConcluidos: 8,
      faturamentoConcluidos: 420, taxaConfirmacao: 80, servicosMaisPopulares: [
        { servicoId: 2, servicoNome: 'Corte', quantidadeAgendamentos: 5 },
      ],
      }), { headers: { 'Content-Type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<MemoryRouter><ContextoAutenticacao.Provider value={{ sessao, carregando: false, autenticar: vi.fn(), encerrar: vi.fn() }}><Relatorios /></ContextoAutenticacao.Provider></MemoryRouter>)
    expect(await screen.findByText('Corte')).toBeInTheDocument()
    expect(screen.getByText('Atendimentos concluídos').parentElement).toHaveTextContent('8')
    expect(screen.getByText('Faturamento concluído').parentElement).toHaveTextContent(/R\$\s?420,00/)
    expect(screen.getByText('Taxa de confirmação').parentElement).toHaveTextContent('80%')
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/admin/estabelecimentos/4/relatorios?')
  })
})
