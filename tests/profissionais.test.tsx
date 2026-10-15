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
  diasDeAtendimento: [1, 7],
  diasDeFolga: ['2026-12-25'],
  estabelecimentoId: 4,
}

const disponibilidadeDaAna = {
  profissionalId: 1,
  jornadas: [
    { diaSemana: 1, horaInicio: '08:00:00', horaFim: '12:00:00' },
    { diaSemana: 1, horaInicio: '14:00:00', horaFim: '18:00:00' },
    { diaSemana: 7, horaInicio: '09:00:00', horaFim: '13:00:00' },
  ],
  folgas: [{ data: '2026-12-25', motivo: 'Natal' }],
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

const ecoar =
  (id: number, status = 200) =>
  (opcoes?: RequestInit) =>
    resposta({ id, ...JSON.parse(String(opcoes?.body)), estabelecimentoId: 4 }, status)

const ecoarDisponibilidade = (id: number) => (opcoes?: RequestInit) =>
  resposta({ profissionalId: id, ...JSON.parse(String(opcoes?.body)) })

function rotasPadrao(profissionais: unknown[] = [ana]): Rotas {
  return {
    [`GET ${base}/profissionais`]: () => resposta(profissionais),
    [`GET ${base}/servicos`]: () => resposta(servicos),
    [`GET ${base}/profissionais/1/disponibilidade`]: () => resposta(disponibilidadeDaAna),
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

function corpoEnviado(requisicoes: ReturnType<typeof stubFetch>, metodo: string, caminho: string) {
  const chamadas = requisicoes.mock.calls.filter(
    ([url, opcoes]) => url === caminho && opcoes?.method === metodo,
  )
  expect(chamadas).toHaveLength(1)
  const [, opcoes] = chamadas[0]
  expect(new Headers(opcoes?.headers).get('X-CSRF-TOKEN')).toBe('token-teste')
  return JSON.parse(String(opcoes?.body))
}

function metodosChamados(requisicoes: ReturnType<typeof stubFetch>) {
  return requisicoes.mock.calls
    .filter(([, opcoes]) => opcoes?.method)
    .map(([url, opcoes]) => `${opcoes?.method} ${url}`)
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

  it('cadastra um profissional e depois seus horários, enviando domingo como 7', async () => {
    const user = userEvent.setup()
    const requisicoes = stubFetch({
      ...rotasPadrao([]),
      [`POST ${base}/profissionais`]: ecoar(2, 201),
      [`PUT ${base}/profissionais/2/disponibilidade`]: ecoarDisponibilidade(2),
    })
    renderizar()
    expect(await screen.findByText(/Nenhum profissional cadastrado/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Novo profissional' }))
    await user.type(screen.getByLabelText('Nome do profissional'), 'Lucas Mendes')
    await user.click(screen.getByRole('checkbox', { name: 'Escova' }))
    await user.click(screen.getByRole('button', { name: 'Adicionar turno em segunda' }))
    await user.click(screen.getByRole('button', { name: 'Adicionar turno em domingo' }))
    await user.clear(screen.getByLabelText('Fim do turno 1 de domingo'))
    await user.type(screen.getByLabelText('Fim do turno 1 de domingo'), '12:00')
    expect(screen.queryByText(/folga/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Lucas Mendes')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Lucas Mendes adicionado(a) à equipe.')
    expect(metodosChamados(requisicoes)).toEqual([
      `POST ${base}/profissionais`,
      `PUT ${base}/profissionais/2/disponibilidade`,
    ])
    expect(corpoEnviado(requisicoes, 'POST', `${base}/profissionais`)).toEqual({
      nome: 'Lucas Mendes',
      especialidades: ['Escova'],
      idsServicos: [11],
      diasDeAtendimento: [1, 7],
      diasDeFolga: [],
    })
    expect(corpoEnviado(requisicoes, 'PUT', `${base}/profissionais/2/disponibilidade`)).toEqual({
      jornadas: [
        { diaSemana: 1, horaInicio: '08:00', horaFim: '18:00' },
        { diaSemana: 7, horaInicio: '08:00', horaFim: '12:00' },
      ],
      folgas: [],
    })
  })

  it('carrega os turnos na edição e preserva as folgas ao salvar', async () => {
    const user = userEvent.setup()
    const requisicoes = stubFetch({
      ...rotasPadrao(),
      [`PUT ${base}/profissionais/1`]: ecoar(1),
      [`PUT ${base}/profissionais/1/disponibilidade`]: ecoarDisponibilidade(1),
    })
    renderizar()
    await user.click(await screen.findByRole('button', { name: 'Ver detalhes de Ana Martins' }))
    expect(await screen.findByLabelText('Início do turno 2 de segunda')).toHaveValue('14:00')
    expect(screen.getByLabelText('Início do turno 1 de domingo')).toHaveValue('09:00')
    expect(screen.queryByText(/folga/i)).not.toBeInTheDocument()
    expect(screen.queryByText('25/12/2026')).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Corte feminino' })).toBeChecked()

    await user.click(screen.getByRole('checkbox', { name: 'Escova' }))
    await user.click(screen.getByRole('button', { name: 'Remover turno 1 de domingo' }))
    await user.click(screen.getByRole('button', { name: 'Adicionar turno em segunda' }))
    expect(screen.getByLabelText('Início do turno 3 de segunda')).toHaveValue('18:00')
    await user.type(screen.getByLabelText('Fim do turno 3 de segunda'), '20:00')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Alterações de Ana Martins salvas.')
    expect(metodosChamados(requisicoes)).toEqual([
      `PUT ${base}/profissionais/1`,
      `PUT ${base}/profissionais/1/disponibilidade`,
    ])
    expect(corpoEnviado(requisicoes, 'PUT', `${base}/profissionais/1`)).toEqual({
      nome: 'Ana Martins',
      especialidades: ['Corte feminino', 'Escova'],
      idsServicos: [10, 11],
      diasDeAtendimento: [1],
      diasDeFolga: ['2026-12-25'],
    })
    expect(corpoEnviado(requisicoes, 'PUT', `${base}/profissionais/1/disponibilidade`)).toEqual({
      jornadas: [
        { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
        { diaSemana: 1, horaInicio: '14:00', horaFim: '18:00' },
        { diaSemana: 1, horaInicio: '18:00', horaFim: '20:00' },
      ],
      folgas: [{ data: '2026-12-25', motivo: 'Natal' }],
    })
  })

  it.each([
    ['sem serviço', [], 'Selecione ao menos um serviço.'],
    ['sem turnos', ['Escova'], 'Adicione ao menos um turno de atendimento.'],
  ])('valida o formulário %s antes de enviar', async (_, marcar, mensagem) => {
    const user = userEvent.setup()
    const requisicoes = stubFetch(rotasPadrao())
    renderizar()
    await user.click(await screen.findByRole('button', { name: 'Novo profissional' }))
    await user.type(screen.getByLabelText('Nome do profissional'), 'Lucas Mendes')
    for (const servico of marcar) await user.click(screen.getByRole('checkbox', { name: servico }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(screen.getByRole('alert')).toHaveTextContent(mensagem)
    expect(metodosChamados(requisicoes)).toEqual([])
  })

  it('bloqueia turnos sobrepostos e invertidos', async () => {
    const user = userEvent.setup()
    const requisicoes = stubFetch(rotasPadrao())
    renderizar()
    await user.click(await screen.findByRole('button', { name: 'Ver detalhes de Ana Martins' }))
    const salvar = await screen.findByRole('button', { name: 'Salvar' })

    await user.clear(screen.getByLabelText('Início do turno 2 de segunda'))
    await user.type(screen.getByLabelText('Início do turno 2 de segunda'), '11:00')
    await user.click(salvar)
    expect(screen.getByRole('alert')).toHaveTextContent('Há turnos sobrepostos em segunda.')

    await user.clear(screen.getByLabelText('Início do turno 2 de segunda'))
    await user.type(screen.getByLabelText('Início do turno 2 de segunda'), '19:00')
    await user.click(salvar)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Os turnos de segunda devem começar antes de terminar.',
    )
    expect(metodosChamados(requisicoes)).toEqual([])
  })

  it('gerencia as folgas por um popup na lista, sem passar pelo formulário', async () => {
    const user = userEvent.setup()
    const requisicoes = stubFetch({
      ...rotasPadrao(),
      [`PUT ${base}/profissionais/1/disponibilidade`]: ecoarDisponibilidade(1),
    })
    renderizar()
    const abrir = await screen.findByRole('button', { name: 'Folgas de Ana Martins' })
    await user.click(abrir)
    const dialogo = screen.getByRole('dialog', { name: 'Folgas de Ana Martins' })
    expect(await within(dialogo).findByText('25/12/2026')).toBeInTheDocument()
    expect(within(dialogo).getByText('Natal')).toBeInTheDocument()
    const data = within(dialogo).getByLabelText('Data da folga')
    expect(data).toHaveFocus()

    const adicionar = within(dialogo).getByRole('button', { name: 'Adicionar folga' })
    await user.click(adicionar)
    expect(within(dialogo).getByRole('alert')).toHaveTextContent('Informe a data da folga.')
    await user.type(data, '2026-12-25')
    await user.click(adicionar)
    expect(within(dialogo).getByRole('alert')).toHaveTextContent('Já existe uma folga nesta data.')

    await user.clear(data)
    await user.type(data, '2026-11-20')
    await user.type(within(dialogo).getByLabelText('Motivo (opcional)'), 'Consulta')
    await user.click(adicionar)
    expect(await within(dialogo).findByRole('status')).toHaveTextContent(
      'Folga de 20/11/2026 adicionada.',
    )
    expect(within(dialogo).getByText('Consulta')).toBeInTheDocument()
    expect(data).toHaveValue('')

    await user.click(within(dialogo).getByRole('button', { name: 'Remover folga de 25/12/2026' }))
    expect(await within(dialogo).findByText('Folga de 25/12/2026 removida.')).toBeInTheDocument()
    expect(within(dialogo).queryByText('Natal')).not.toBeInTheDocument()

    const caminho = `${base}/profissionais/1/disponibilidade`
    expect(metodosChamados(requisicoes)).toEqual([`PUT ${caminho}`, `PUT ${caminho}`])
    const [primeiro, segundo] = requisicoes.mock.calls
      .filter(([url, opcoes]) => url === caminho && opcoes?.method === 'PUT')
      .map(([, opcoes]) => JSON.parse(String(opcoes?.body)))
    // Os turnos carregados são reenviados sem alteração, com domingo de volta como 7.
    const jornadas = [
      { diaSemana: 1, horaInicio: '08:00', horaFim: '12:00' },
      { diaSemana: 1, horaInicio: '14:00', horaFim: '18:00' },
      { diaSemana: 7, horaInicio: '09:00', horaFim: '13:00' },
    ]
    expect(primeiro).toEqual({
      jornadas,
      folgas: [
        { data: '2026-12-25', motivo: 'Natal' },
        { data: '2026-11-20', motivo: 'Consulta' },
      ],
    })
    expect(segundo).toEqual({ jornadas, folgas: [{ data: '2026-11-20', motivo: 'Consulta' }] })

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(abrir).toHaveFocus()
  })

  it('mantém as folgas e mostra o erro quando salvar no popup falha', async () => {
    const user = userEvent.setup()
    stubFetch({
      ...rotasPadrao(),
      [`PUT ${base}/profissionais/1/disponibilidade`]: () =>
        resposta({ mensagem: 'Erro no servidor.' }, 500),
    })
    renderizar()
    await user.click(await screen.findByRole('button', { name: 'Folgas de Ana Martins' }))
    const dialogo = screen.getByRole('dialog', { name: 'Folgas de Ana Martins' })
    await within(dialogo).findByText('25/12/2026')
    await user.type(within(dialogo).getByLabelText('Data da folga'), '2026-11-20')
    await user.click(within(dialogo).getByRole('button', { name: 'Adicionar folga' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Erro no servidor.')
    expect(within(dialogo).queryByText('20/11/2026')).not.toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Data da folga')).toHaveValue('2026-11-20')
    await user.click(within(dialogo).getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('não duplica o cadastro quando os horários falham e o usuário tenta de novo', async () => {
    const user = userEvent.setup()
    let falharHorarios = true
    const requisicoes = stubFetch({
      ...rotasPadrao([]),
      [`POST ${base}/profissionais`]: ecoar(2, 201),
      [`PUT ${base}/profissionais/2`]: ecoar(2),
      [`PUT ${base}/profissionais/2/disponibilidade`]: (opcoes) =>
        falharHorarios
          ? resposta({ mensagem: 'Erro no servidor.' }, 500)
          : ecoarDisponibilidade(2)(opcoes),
    })
    renderizar()
    await user.click(await screen.findByRole('button', { name: 'Novo profissional' }))
    await user.type(screen.getByLabelText('Nome do profissional'), 'Lucas Mendes')
    await user.click(screen.getByRole('checkbox', { name: 'Escova' }))
    await user.click(screen.getByRole('button', { name: 'Adicionar turno em terça' }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Lucas Mendes foi salvo(a), mas os horários não: Erro no servidor. Tente salvar novamente.',
    )
    expect(screen.getByLabelText('Início do turno 1 de terça')).toHaveValue('08:00')

    falharHorarios = false
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Alterações de Lucas Mendes salvas.',
    )
    expect(metodosChamados(requisicoes)).toEqual([
      `POST ${base}/profissionais`,
      `PUT ${base}/profissionais/2/disponibilidade`,
      `PUT ${base}/profissionais/2`,
      `PUT ${base}/profissionais/2/disponibilidade`,
    ])
    expect(screen.getAllByText('Lucas Mendes')).toHaveLength(1)
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
    await user.click(screen.getByRole('button', { name: 'Adicionar turno em segunda' }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    const alertas = await screen.findAllByRole('alert')
    expect(alertas.map((alerta) => alerta.textContent)).toEqual([
      'O nome é obrigatório',
      'Dados inválidos.',
    ])
    expect(screen.getByRole('heading', { name: 'Novo profissional' })).toBeInTheDocument()
  })

  it('permite tentar novamente quando os horários não carregam', async () => {
    const user = userEvent.setup()
    let falhar = true
    stubFetch({
      ...rotasPadrao(),
      [`GET ${base}/profissionais/1/disponibilidade`]: () =>
        falhar ? resposta({ mensagem: 'Erro no servidor.' }, 500) : resposta(disponibilidadeDaAna),
    })
    renderizar()
    await user.click(await screen.findByRole('button', { name: 'Ver detalhes de Ana Martins' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro no servidor.')
    falhar = false
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByLabelText('Início do turno 1 de segunda')).toHaveValue('08:00')
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
