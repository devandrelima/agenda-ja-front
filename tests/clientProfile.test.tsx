import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ContextoAutenticacao } from '../src/app/authState'
import { PerfilCliente } from '../src/features/client/Profile'

const perfil = { id: 1, nome: 'Ana Souza', telefone: '85999998888', email: 'ana@exemplo.com', fotoUrl: null }
const encerrar = vi.fn(async () => {})
let chamadas: { caminho: string; metodo: string; corpo?: string }[] = []

function resposta(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderizar() {
  render(
    <ContextoAutenticacao.Provider
      value={{ sessao: null, carregando: false, autenticar: vi.fn(), encerrar }}
    >
      <MemoryRouter initialEntries={['/meu-perfil']}>
        <Routes>
          <Route path="/meu-perfil" element={<PerfilCliente />} />
          <Route path="/login" element={<p>Tela de login</p>} />
        </Routes>
      </MemoryRouter>
    </ContextoAutenticacao.Provider>,
  )
}

beforeEach(() => {
  chamadas = []
  encerrar.mockClear()
  vi.stubGlobal('fetch', vi.fn(async (entrada: RequestInfo | URL, opcoes?: RequestInit) => {
    const caminho = String(entrada)
    const metodo = opcoes?.method ?? 'GET'
    chamadas.push({ caminho, metodo, corpo: opcoes?.body as string | undefined })
    if (caminho === '/api/auth/csrf') return resposta({ token: 'csrf' })
    if (caminho === '/api/clientes/me' && metodo === 'GET') return resposta(perfil)
    if (caminho === '/api/clientes/me' && metodo === 'PUT')
      return resposta({ ...perfil, ...JSON.parse(opcoes!.body as string) })
    return resposta({ mensagem: 'Rota não esperada.' }, 404)
  }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('mostra os dados do cliente e salva nome e telefone editados', async () => {
  const user = userEvent.setup()
  renderizar()

  expect(await screen.findByRole('heading', { name: 'Meu perfil' })).toBeInTheDocument()
  expect(await screen.findByLabelText('Nome completo')).toHaveValue('Ana Souza')
  expect(screen.getByLabelText('Telefone/WhatsApp')).toHaveValue('(85) 9 9999-8888')
  expect(screen.getByLabelText('E-mail')).toHaveValue('ana@exemplo.com')

  await user.clear(screen.getByLabelText('Nome completo'))
  await user.type(screen.getByLabelText('Nome completo'), 'Ana Lima')
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

  expect(await screen.findByText('Informações atualizadas com sucesso.')).toBeInTheDocument()
  const envio = chamadas.find((c) => c.metodo === 'PUT')
  expect(JSON.parse(envio!.corpo!)).toMatchObject({ nome: 'Ana Lima', telefone: '(85) 9 9999-8888' })
})

it('valida o e-mail antes de enviar', async () => {
  const user = userEvent.setup()
  renderizar()
  const campo = await screen.findByLabelText('E-mail')
  await user.clear(campo)
  await user.type(campo, 'ana@b')
  await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Informe um e-mail válido.')
  expect(chamadas.some((c) => c.metodo === 'PUT')).toBe(false)
})
