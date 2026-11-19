import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { ContextoAutenticacao } from '../src/app/authState'
import { ClienteDetalhe, Clientes } from '../src/features/provider/Clients'

const sessao = { id: 1, nome: 'Gestora', email: 'g@a.com', role: 'GESTOR', estabelecimentoId: 4 }
const base = '/api/admin/estabelecimentos/4/clientes'

const resumos = [
  { id: 7, nome: 'Maria José', telefone: '85999998888', totalVisitas: 3, ultimaVisita: '2026-11-07T14:00:00' },
  { id: 8, nome: 'João Pedro', telefone: '85988887777', totalVisitas: 1, ultimaVisita: null },
]
const historico = {
  id: 7,
  nome: 'Maria José',
  telefone: '85999998888',
  servicoMaisFrequente: 'Escova',
  agendamentos: [
    { id: 1, servicoNome: 'Escova', profissionalNome: 'Ana Martins', dataHoraInicio: '2026-11-07T14:00:00', status: 'CONCLUIDO', valor: 55 },
    { id: 2, servicoNome: 'Corte feminino', profissionalNome: 'Beatriz Lima', dataHoraInicio: '2026-10-20T09:30:00', status: 'CANCELADO', valor: 75 },
  ],
}

function json(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderizar(rota: string) {
  render(
    <ContextoAutenticacao.Provider value={{ sessao, carregando: false, autenticar: vi.fn(), encerrar: vi.fn() }}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/painel/clientes" element={<Clientes />} />
          <Route path="/painel/clientes/:clienteId" element={<ClienteDetalhe />} />
        </Routes>
      </MemoryRouter>
    </ContextoAutenticacao.Provider>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('lista os clientes com a contagem de agendamentos e filtra pelo nome', async () => {
  const fetchFalso = vi.fn(async () => json(resumos))
  vi.stubGlobal('fetch', fetchFalso)
  const user = userEvent.setup()
  renderizar('/painel/clientes')

  const maria = await screen.findByRole('link', { name: /maria josé/i })
  expect(maria).toHaveTextContent('3 agendamentos')
  expect(maria).toHaveTextContent('Última visita em 07/11/2026')
  expect(maria).toHaveAttribute('href', '/painel/clientes/7')
  expect(screen.getByRole('link', { name: /joão pedro/i })).toHaveTextContent('1 agendamento')
  expect(fetchFalso).toHaveBeenCalledWith(base, expect.anything())

  await user.type(screen.getByRole('searchbox', { name: 'Buscar cliente por nome' }), 'joao')
  expect(screen.queryByRole('link', { name: /maria josé/i })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: /joão pedro/i })).toBeInTheDocument()

  await user.clear(screen.getByRole('searchbox'))
  await user.type(screen.getByRole('searchbox'), 'xyz')
  expect(screen.getByText(/nenhum cliente encontrado/i)).toBeInTheDocument()
})

it('combina a busca por nome com a quantidade mínima de agendamentos', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => json(resumos)))
  const user = userEvent.setup()
  renderizar('/painel/clientes')

  await screen.findByRole('link', { name: /maria josé/i })
  await user.type(screen.getByRole('spinbutton', { name: 'Quantidade mínima de agendamentos' }), '2')
  expect(screen.getByRole('link', { name: /maria josé/i })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /joão pedro/i })).not.toBeInTheDocument()

  await user.type(screen.getByRole('searchbox', { name: 'Buscar cliente por nome' }), 'joao')
  expect(screen.getByText(/nenhum cliente encontrado com esses filtros/i)).toBeInTheDocument()
})

it('mostra o estado vazio quando não há clientes', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => json([])))
  renderizar('/painel/clientes')
  expect(await screen.findByText(/nenhum cliente com agendamentos/i)).toBeInTheDocument()
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
})

it('permite tentar de novo quando a lista falha', async () => {
  let chamadas = 0
  vi.stubGlobal('fetch', vi.fn(async () => (++chamadas === 1 ? json({}, 500) : json(resumos))))
  const user = userEvent.setup()
  renderizar('/painel/clientes')

  expect(await screen.findByRole('alert')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByRole('link', { name: /maria josé/i })).toBeInTheDocument()
})

it('mostra contato e histórico do cliente', async () => {
  const fetchFalso = vi.fn(async () => json(historico))
  vi.stubGlobal('fetch', fetchFalso)
  renderizar('/painel/clientes/7')

  expect(await screen.findByRole('heading', { name: 'Maria José' })).toBeInTheDocument()
  expect(fetchFalso).toHaveBeenCalledWith(`${base}/7`, expect.anything())
  expect(screen.getByRole('link', { name: '(85) 9 9999-8888' })).toHaveAttribute('href', 'tel:+5585999998888')
  expect(screen.getByRole('link', { name: 'Chamar no WhatsApp' })).toHaveAttribute('href', 'https://wa.me/5585999998888')
  expect(screen.getByText('Escova', { selector: 'strong' })).toBeInTheDocument()
  expect(screen.getByText(/07\/11\/2026 às 14:00 · Ana Martins · R\$\s55,00/)).toBeInTheDocument()
  expect(screen.getByText(/20\/10\/2026 às 09:30/)).toBeInTheDocument()
  expect(screen.getByText('Concluído')).toBeInTheDocument()
  expect(screen.getByText('Cancelado')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /voltar para clientes/i })).toHaveAttribute('href', '/painel/clientes')
})

it('informa quando o cliente não existe neste estabelecimento', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => json({}, 404)))
  renderizar('/painel/clientes/99')
  expect(await screen.findByRole('alert')).toHaveTextContent('Cliente não encontrado.')
  expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
})

it('rejeita um identificador inválido sem chamar a API', async () => {
  const fetchFalso = vi.fn()
  vi.stubGlobal('fetch', fetchFalso)
  renderizar('/painel/clientes/abc')
  expect(await screen.findByRole('alert')).toHaveTextContent('Cliente não encontrado.')
  expect(fetchFalso).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
})
