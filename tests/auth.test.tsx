import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../src/app/App'

const sessao = {
  id: 1,
  nome: 'Ana Gestora',
  email: 'ana@aurora.com',
  role: 'GESTOR',
  estabelecimentoId: 4,
}

function resposta(dados: object | null, status = 200) {
  return new Response(dados ? JSON.stringify(dados) : null, {
    status,
    headers: dados ? { 'Content-Type': 'application/json' } : {},
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

it('protege o painel sem sessão', async () => {
  const requisicoes = vi.fn(async () => resposta(null, 401))
  vi.stubGlobal('fetch', requisicoes)
  window.history.replaceState(null, '', '/painel')

  render(<App />)

  expect(await screen.findByRole('heading', { name: 'Acesse sua conta' })).toBeInTheDocument()
  expect(window.location.pathname).toBe('/login')
  expect(requisicoes).toHaveBeenCalledWith(
    '/api/auth/me',
    expect.objectContaining({ credentials: 'same-origin' }),
  )
})

it('autentica o gestor com CSRF, restaura o painel e encerra a sessão', async () => {
  const requisicoes = vi.fn(async (entrada: string) => {
    if (entrada === '/api/auth/me') return resposta(null, 401)
    if (entrada === '/api/auth/csrf') return resposta({ token: 'token-teste' })
    if (entrada === '/api/auth/login') return resposta(sessao)
    if (entrada === '/api/auth/logout') return resposta(null, 204)
    if (entrada === '/api/admin/estabelecimentos/4') {
      return resposta({ nome: 'Ateliê Aurora', categoria: 'Salão de beleza', localizacao: 'Centro' })
    }
    throw new Error(`Rota inesperada: ${entrada}`)
  })
  vi.stubGlobal('fetch', requisicoes)
  window.history.replaceState(null, '', '/login')
  const usuario = userEvent.setup()

  render(<App />)
  await usuario.type(screen.getByLabelText('E-mail'), sessao.email)
  await usuario.type(screen.getByLabelText('Senha'), 'senha-segura')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled())
  await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

  expect(await screen.findByRole('heading', { name: 'Olá, Ana Gestora' })).toBeInTheDocument()
  expect(window.location.pathname).toBe('/painel')
  expect(requisicoes).toHaveBeenCalledWith(
    '/api/auth/login',
    expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin',
      headers: expect.objectContaining({ 'X-CSRF-TOKEN': 'token-teste' }),
    }),
  )

  expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  await usuario.click(screen.getByRole('button', { name: 'Configurações' }))
  expect(await screen.findByRole('heading', { name: 'Configurações' })).toBeInTheDocument()
  expect(window.location.pathname).toBe('/painel/configuracoes')
  await usuario.click(screen.getByRole('button', { name: /^Sair$/ }))
  expect(await screen.findByRole('dialog', { name: 'Sair da conta?' })).toBeInTheDocument()
  expect(requisicoes.mock.calls.some(([entrada]) => entrada === '/api/auth/logout')).toBe(false)
  await usuario.click(screen.getByRole('button', { name: 'Sair da conta' }))
  expect(await screen.findByRole('heading', { name: 'Acesse sua conta' })).toBeInTheDocument()
  expect(window.location.pathname).toBe('/login')
  expect(requisicoes).toHaveBeenCalledWith(
    '/api/auth/logout',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'X-CSRF-TOKEN': 'token-teste' }),
    }),
  )
})

it('mantém o usuário no login quando as credenciais são inválidas', async () => {
  const requisicoes = vi.fn(async (entrada: string) => {
    if (entrada === '/api/auth/me') return resposta(null, 401)
    if (entrada === '/api/auth/csrf') return resposta({ token: 'token-teste' })
    if (entrada === '/api/auth/login') return resposta({ mensagem: 'Credenciais inválidas.' }, 401)
    throw new Error(`Rota inesperada: ${entrada}`)
  })
  vi.stubGlobal('fetch', requisicoes)
  window.history.replaceState(null, '', '/login')
  const usuario = userEvent.setup()

  render(<App />)
  await usuario.type(screen.getByLabelText('E-mail'), sessao.email)
  await usuario.type(screen.getByLabelText('Senha'), 'senha-incorreta')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled())
  await usuario.click(screen.getByRole('button', { name: 'Entrar' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.')
  expect(window.location.pathname).toBe('/login')
})

it('cadastra estabelecimento com os campos exigidos e mostra erros da API', async () => {
  let tentativa = 0
  const requisicoes = vi.fn(async (...argumentos: [string, RequestInit?]) => {
    const entrada = argumentos[0]
    if (entrada === '/api/auth/me') return resposta(null, 401)
    if (entrada === '/api/auth/csrf') return resposta({ token: 'token-teste' })
    if (entrada === '/api/estabelecimentos') {
      tentativa += 1
      return tentativa === 1
        ? resposta({ mensagem: 'E-mail já cadastrado no sistema.' }, 409)
        : resposta(null, 201)
    }
    throw new Error(`Rota inesperada: ${entrada}`)
  })
  vi.stubGlobal('fetch', requisicoes)
  window.history.replaceState(null, '', '/cadastro')
  const usuario = userEvent.setup()

  render(<App />)
  await usuario.type(screen.getByLabelText('Nome do negócio'), 'Ateliê Aurora')
  await usuario.selectOptions(screen.getByLabelText('Categoria'), 'Salão de beleza')
  await usuario.type(screen.getByLabelText('Localização'), 'Centro, Fortaleza')
  await usuario.type(screen.getByLabelText('Nome do gestor'), 'Ana Gestora')
  await usuario.type(screen.getByLabelText('E-mail'), sessao.email)
  await usuario.type(screen.getByLabelText('Senha'), 'senha-segura')
  await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('E-mail já cadastrado no sistema.')
  expect(window.location.pathname).toBe('/cadastro')
  const cadastro = requisicoes.mock.calls.find(([caminho]) => caminho === '/api/estabelecimentos')
  expect(JSON.parse(String(cadastro?.[1]?.body))).toMatchObject({
    nomeNegocio: 'Ateliê Aurora',
    categoria: 'Salão de beleza',
    localizacao: 'Centro, Fortaleza',
    nomeGestor: 'Ana Gestora',
    email: sessao.email,
    senha: 'senha-segura',
  })

  await usuario.click(screen.getByRole('button', { name: 'Criar conta' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Conta criada.')
  expect(window.location.pathname).toBe('/login')
})
