import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContextoAutenticacao } from '../src/app/authState'
import { Profissionais } from '../src/features/provider/Professionals'

const sessao = {
  id: 1,
  nome: 'Ana Gestora',
  email: 'ana@aurora.com',
  role: 'GESTOR',
  estabelecimentoId: 4,
}

const base = '/api/admin/estabelecimentos/4'

const servicos = [
  { id: 10, nome: 'Corte feminino', duracaoMinutos: 60, valor: 75, estabelecimentoId: 4 },
  { id: 11, nome: 'Escova', duracaoMinutos: 45, valor: 55, estabelecimentoId: 4 },
]

const ana = {
  id: 1,
  nome: 'Ana Martins',
  especialidades: ['Corte', 'Coloração'],
  idsServicos: [10],
  diasDeAtendimento: [1, 2, 7],
  diasDeFolga: ['2026-12-25'],
  estabelecimentoId: 4,
}

function resposta(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type Rotas = Record<string, (opcoes?: RequestInit) => Response>

function stubFetch(rotas: Rotas) {
  const requisicoes = vi.fn(async (caminho: string, opcoes?: RequestInit) => {
    const chave = `${opcoes?.method ?? 'GET'} ${caminho}`
    const rota = rotas[chave]
    if (!rota) throw new Error(`Rota inesperada: ${chave}`)
    return rota(opcoes)
  })
  vi.stubGlobal('fetch', requisicoes)
  return requisicoes
}

function rotasPadrao(profissionais: unknown[] = [ana]): Rotas {
  return {
    [`GET ${base}/profissionais`]: () => resposta(profissionais),
    [`GET ${base}/servicos`]: () => resposta(servicos),
    'GET /api/auth/csrf': () => resposta({ token: 'token-teste' }),
  }
}

function renderizar() {
  render(
    <MemoryRouter>
      <ContextoAutenticacao.Provider
        value={{ sessao, carregando: false, autenticar: vi.fn(), encerrar: vi.fn() }}
      >
        <Profissionais />
      </ContextoAutenticacao.Provider>
    </MemoryRouter>,
  )
}

function corpoEnviado(requisicoes: ReturnType<typeof stubFetch>, metodo: string) {
  const chamada = requisicoes.mock.calls.find(([, opcoes]) => opcoes?.method === metodo)
  expect(chamada).toBeDefined()
  const [, opcoes] = chamada!
  expect(new Headers(opcoes?.headers).get('X-CSRF-TOKEN')).toBe('token-teste')
  return JSON.parse(String(opcoes?.body))
}

describe('tela de profissionais', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('lista os profissionais com os serviços como especialidades', async () => {
    stubFetch(rotasPadrao())
    renderizar()
    expect(await screen.findByText('Ana Martins')).toBeInTheDocument()
    expect(screen.getByText('Corte feminino')).toBeInTheDocument()
    expect(screen.queryByText('Corte, Coloração')).not.toBeInTheDocument()
  })

  it('cadastra um profissional enviando domingo como 7', async () => {
    const user = userEvent.setup()
    const requisicoes = stubFetch({
      ...rotasPadrao([]),
      [`POST ${base}/profissionais`]: (opcoes) =>
        resposta({ id: 2, ...JSON.parse(String(opcoes?.body)), estabelecimentoId: 4 }, 201),
    })
    renderizar()
    expect(await screen.findByText(/Nenhum profissional cadastrado/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Novo profissional' }))
    await user.type(screen.getByLabelText('Nome do profissional'), 'Lucas Mendes')
    await user.click(screen.getByRole('checkbox', { name: 'Escova' }))
    await user.click(screen.getByRole('checkbox', { name: 'seg' }))
    await user.click(screen.getByRole('checkbox', { name: 'dom' }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Lucas Mendes')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Lucas Mendes adicionado(a) à equipe.')
    expect(corpoEnviado(requisicoes, 'POST')).toEqual({
      nome: 'Lucas Mendes',
      especialidades: ['Escova'],
      idsServicos: [11],
      diasDeAtendimento: [1, 7],
      diasDeFolga: [],
    })
  })

  it('exige ao menos um serviço antes de enviar', async () => {
    const user = userEvent.setup()
    const requisicoes = stubFetch(rotasPadrao())
    renderizar()
    await user.click(await screen.findByRole('button', { name: 'Novo profissional' }))
    expect(screen.queryByLabelText('Especialidades')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Nome do profissional'), 'Lucas Mendes')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Selecione ao menos um serviço.')
    expect(requisicoes.mock.calls.some(([, opcoes]) => opcoes?.method === 'POST')).toBe(false)
  })

  it('edita um profissional atualizando as especialidades e preservando as folgas', async () => {
    const user = userEvent.setup()
    const requisicoes = stubFetch({
      ...rotasPadrao(),
      [`PUT ${base}/profissionais/1`]: (opcoes) =>
        resposta({ id: 1, ...JSON.parse(String(opcoes?.body)), estabelecimentoId: 4 }),
    })
    renderizar()
    await user.click(await screen.findByRole('button', { name: 'Ver detalhes de Ana Martins' }))
    expect(screen.getByRole('checkbox', { name: 'Corte feminino' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'dom' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'sáb' })).not.toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: 'Escova' }))
    await user.click(screen.getByRole('checkbox', { name: 'dom' }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Alterações de Ana Martins salvas.')
    expect(corpoEnviado(requisicoes, 'PUT')).toEqual({
      nome: 'Ana Martins',
      especialidades: ['Corte feminino', 'Escova'],
      idsServicos: [10, 11],
      diasDeAtendimento: [1, 2],
      diasDeFolga: ['2026-12-25'],
    })
  })

  it('exibe os erros retornados pela API no formulário', async () => {
    const user = userEvent.setup()
    stubFetch({
      ...rotasPadrao(),
      [`POST ${base}/profissionais`]: () =>
        resposta({ mensagem: 'Dados inválidos.', erros: { nome: 'O nome é obrigatório' } }, 400),
    })
    renderizar()
    await user.click(await screen.findByRole('button', { name: 'Novo profissional' }))
    await user.type(screen.getByLabelText('Nome do profissional'), 'Lucas')
    await user.click(screen.getByRole('checkbox', { name: 'Escova' }))
    await user.click(screen.getByRole('checkbox', { name: 'seg' }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    const alertas = await screen.findAllByRole('alert')
    expect(alertas.map((alerta) => alerta.textContent)).toEqual([
      'O nome é obrigatório',
      'Dados inválidos.',
    ])
    expect(screen.getByRole('heading', { name: 'Novo profissional' })).toBeInTheDocument()
  })

  it('permite tentar novamente quando a lista falha', async () => {
    const user = userEvent.setup()
    let falhar = true
    stubFetch({
      ...rotasPadrao(),
      [`GET ${base}/profissionais`]: () =>
        falhar ? resposta({ mensagem: 'Erro no servidor.' }, 500) : resposta([ana]),
    })
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro no servidor.')
    falhar = false
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Ana Martins')).toBeInTheDocument()
  })

  it('indica quando não há serviços para vincular', async () => {
    const user = userEvent.setup()
    stubFetch({ ...rotasPadrao(), [`GET ${base}/servicos`]: () => resposta([]) })
    renderizar()
    await user.click(await screen.findByRole('button', { name: 'Novo profissional' }))
    const grupo = screen.getByRole('group', { name: 'Serviços' })
    expect(within(grupo).getByRole('link', { name: 'Cadastrar serviços' })).toHaveAttribute(
      'href',
      '/painel/servicos',
    )
  })
})
