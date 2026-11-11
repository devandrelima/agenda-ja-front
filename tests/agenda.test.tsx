import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextoAutenticacao } from '../src/app/authState'
import { INTERVALO_ATUALIZACAO_MS } from '../src/data/agenda'
import { Agenda } from '../src/features/provider/Agenda'

const sessao = {
  id: 1,
  nome: 'Ana Gestora',
  email: 'ana@aurora.com',
  role: 'GESTOR',
  estabelecimentoId: 4,
}

const agendamento = (campos: Record<string, unknown>) => ({
  id: 1,
  clienteNome: 'Marina Souza',
  servicoNome: 'Corte feminino',
  profissionalId: 1,
  profissionalNome: 'Ana Martins',
  dataHoraInicio: '2026-11-10T10:00:00',
  dataHoraFim: '2026-11-10T11:00:00',
  status: 'CONFIRMADO',
  ...campos,
})

function resposta(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const profissional = (id: number, nome: string) => ({
  id,
  nome,
  especialidades: [],
  idsServicos: [],
  diasDeAtendimento: [1],
  diasDeFolga: [],
  estabelecimentoId: 4,
})

function stubFetch(tratar: (url: URL) => Response, profissionais?: Response) {
  const requisicoes = vi.fn(async (caminho: string) => {
    const url = new URL(caminho, 'http://localhost')
    if (url.pathname.endsWith('/profissionais'))
      return (
        profissionais ?? resposta([profissional(1, 'Ana Martins'), profissional(2, 'Clara Nunes')])
      )
    return tratar(url)
  })
  vi.stubGlobal('fetch', requisicoes)
  return requisicoes
}

/** URLs das consultas à agenda (ignora a lista de profissionais do filtro). */
const consultasDaAgenda = (requisicoes: ReturnType<typeof stubFetch>) =>
  requisicoes.mock.calls
    .map(([caminho]) => new URL(String(caminho), 'http://localhost'))
    .filter((url) => url.pathname.endsWith('/agenda'))

function renderizar() {
  render(
    <MemoryRouter>
      <ContextoAutenticacao.Provider
        value={{ sessao, carregando: false, autenticar: vi.fn(), encerrar: vi.fn() }}
      >
        <Agenda />
      </ContextoAutenticacao.Provider>
    </MemoryRouter>,
  )
}

describe('agenda semanal', () => {
  beforeEach(() => {
    // Quarta-feira, 11/11/2026: a semana exibida vai de 09/11 a 15/11.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-11T15:00:00Z') })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('mostra sete colunas, de segunda a domingo, e destaca hoje', async () => {
    stubFetch(() => resposta([]))
    renderizar()
    const cabecalhos = await screen.findAllByRole('columnheader')
    expect(cabecalhos.map((item) => item.textContent)).toEqual([
      'Hora',
      'seg. 09',
      'ter. 10',
      'qua. 11',
      'qui. 12',
      'sex. 13',
      'sáb. 14',
      'dom. 15',
    ])
    expect(screen.getByText('qua. 11')).toHaveClass('today')
    expect(screen.getByText('08:00')).toBeInTheDocument()
    expect(screen.getByText('18:00')).toBeInTheDocument()
  })

  it('consulta a agenda da semana inteira em horário local', async () => {
    const requisicoes = stubFetch(() => resposta([]))
    renderizar()
    await screen.findByRole('table', { name: 'Agenda da semana' })
    expect(consultasDaAgenda(requisicoes)).toHaveLength(1)
    const [url] = consultasDaAgenda(requisicoes)
    expect(url.pathname).toBe('/api/admin/estabelecimentos/4/agenda')
    expect(url.searchParams.get('inicio')).toBe('2026-11-09T00:00:00')
    expect(url.searchParams.get('fim')).toBe('2026-11-15T23:59:59')
  })

  it('exibe cliente, serviço, horário e status em cada bloco', async () => {
    stubFetch(() =>
      resposta([
        agendamento({}),
        agendamento({
          id: 2,
          clienteNome: 'Paula Reis',
          servicoNome: 'Escova',
          dataHoraInicio: '2026-11-12T14:30:00',
          dataHoraFim: '2026-11-12T15:15:00',
          status: 'AGUARDANDO_CONFIRMACAO',
        }),
      ]),
    )
    renderizar()
    const marina = (await screen.findByText('Marina Souza')).closest(
      '.agenda-bloco',
    )! as HTMLElement
    expect(within(marina).getByText('Corte feminino')).toBeInTheDocument()
    expect(within(marina).getByText('10:00 – 11:00')).toBeInTheDocument()
    expect(within(marina).getByText('Confirmado')).toBeInTheDocument()
    const paula = screen.getByText('Paula Reis').closest('.agenda-bloco')! as HTMLElement
    expect(within(paula).getByText('14:30 – 15:15')).toBeInTheDocument()
    expect(within(paula).getByText('Aguardando confirmação')).toBeInTheDocument()
  })

  it('mostra todos os agendamentos que começam na mesma hora', async () => {
    stubFetch(() =>
      resposta([
        agendamento({}),
        agendamento({ id: 2, clienteNome: 'Luana Costa', profissionalId: 2 }),
      ]),
    )
    renderizar()
    expect(await screen.findByText('Marina Souza')).toBeInTheDocument()
    expect(screen.getByText('Luana Costa')).toBeInTheDocument()
  })

  it('amplia as horas exibidas para um agendamento fora do expediente', async () => {
    stubFetch(() =>
      resposta([
        agendamento({ dataHoraInicio: '2026-11-10T06:30:00', dataHoraFim: '2026-11-10T07:00:00' }),
      ]),
    )
    renderizar()
    expect(await screen.findByText('06:00')).toBeInTheDocument()
  })

  it('permite tentar de novo quando a consulta falha', async () => {
    let falhar = true
    stubFetch(() =>
      falhar ? resposta({ mensagem: 'Erro interno.' }, 500) : resposta([agendamento({})]),
    )
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro interno.')
    falhar = false
    screen.getByRole('button', { name: 'Tentar novamente' }).click()
    expect(await screen.findByText('Marina Souza')).toBeInTheDocument()
  })

  it('navega entre semanas e volta para a semana atual', async () => {
    const user = userEvent.setup()
    const requisicoes = stubFetch((url) =>
      url.searchParams.get('inicio') === '2026-11-16T00:00:00'
        ? resposta([
            agendamento({
              clienteNome: 'Paula Reis',
              dataHoraInicio: '2026-11-17T09:00:00',
              dataHoraFim: '2026-11-17T10:00:00',
            }),
          ])
        : resposta([agendamento({})]),
    )
    renderizar()
    expect(await screen.findByText('Marina Souza')).toBeInTheDocument()
    expect(screen.getByText('9 a 15 de novembro de 2026')).toBeInTheDocument()
    expect(screen.getByText('Semana atual')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Próxima semana' }))
    expect(await screen.findByText('Paula Reis')).toBeInTheDocument()
    expect(screen.queryByText('Marina Souza')).not.toBeInTheDocument()
    expect(screen.getByText('16 a 22 de novembro de 2026')).toBeInTheDocument()
    expect(screen.queryByText('Semana atual')).not.toBeInTheDocument()
    expect(screen.getByText('seg. 16')).toBeInTheDocument()
    expect(screen.queryByText('qua. 11')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Hoje' }))
    expect(await screen.findByText('Marina Souza')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Semana anterior' }))
    expect(await screen.findByText('2 a 8 de novembro de 2026')).toBeInTheDocument()
    const ultima = consultasDaAgenda(requisicoes).at(-1)!
    expect(ultima.searchParams.get('inicio')).toBe('2026-11-02T00:00:00')
  })

  it('filtra por profissional e por status na consulta', async () => {
    const user = userEvent.setup()
    const requisicoes = stubFetch((url) =>
      resposta(
        url.searchParams.get('profissionalId') === '2'
          ? [agendamento({ id: 3, clienteNome: 'Paula Reis', profissionalId: 2 })]
          : [agendamento({})],
      ),
    )
    renderizar()
    expect(await screen.findByText('Marina Souza')).toBeInTheDocument()
    expect(consultasDaAgenda(requisicoes)[0].searchParams.has('profissionalId')).toBe(false)
    expect(consultasDaAgenda(requisicoes)[0].searchParams.has('status')).toBe(false)

    await user.selectOptions(
      await screen
        .findByRole('option', { name: 'Clara Nunes' })
        .then(() => screen.getByLabelText('Filtrar por profissional')),
      'Clara Nunes',
    )
    expect(await screen.findByText('Paula Reis')).toBeInTheDocument()
    expect(screen.queryByText('Marina Souza')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Filtrar por status'), 'Cancelado')
    await screen.findByRole('table')
    const ultima = consultasDaAgenda(requisicoes).at(-1)!
    expect(ultima.searchParams.get('profissionalId')).toBe('2')
    expect(ultima.searchParams.getAll('status')).toEqual(['CANCELADO'])

    await user.selectOptions(screen.getByLabelText('Filtrar por profissional'), '')
    await user.selectOptions(screen.getByLabelText('Filtrar por status'), '')
    await screen.findByText('Marina Souza')
    expect(consultasDaAgenda(requisicoes).at(-1)!.searchParams.has('status')).toBe(false)
  })

  it('mantém a agenda funcionando quando a lista de profissionais falha', async () => {
    stubFetch(() => resposta([agendamento({})]), resposta({ mensagem: 'Erro.' }, 500))
    renderizar()
    expect(await screen.findByText('Marina Souza')).toBeInTheDocument()
    expect(screen.getByLabelText('Filtrar por profissional')).toHaveValue('')
  })
})

describe('atualização periódica da agenda', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-11T15:00:00Z') })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  })

  const passar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

  it('busca a semana de novo no intervalo e troca os blocos sem tela de carregamento', async () => {
    let lista = [agendamento({})]
    const requisicoes = stubFetch(() => resposta(lista))
    renderizar()
    await passar(0)
    expect(screen.getByText('Marina Souza')).toBeInTheDocument()

    // Remarcada para outra semana e substituída por outra reserva: a antiga some da tela.
    lista = [agendamento({ id: 2, clienteNome: 'Paula Reis' })]
    await passar(INTERVALO_ATUALIZACAO_MS)
    expect(screen.getByText('Paula Reis')).toBeInTheDocument()
    expect(screen.queryByText('Marina Souza')).not.toBeInTheDocument()
    expect(screen.queryByText('Carregando agenda...')).not.toBeInTheDocument()
    expect(consultasDaAgenda(requisicoes)).toHaveLength(2)
  })

  it('não consulta enquanto a aba está oculta e atualiza ao voltar', async () => {
    const requisicoes = stubFetch(() => resposta([agendamento({})]))
    renderizar()
    await passar(0)
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    await passar(INTERVALO_ATUALIZACAO_MS * 2)
    expect(consultasDaAgenda(requisicoes)).toHaveLength(1)

    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(consultasDaAgenda(requisicoes)).toHaveLength(2)
  })

  it('não empilha consultas enquanto a anterior não terminou', async () => {
    let liberar: (resposta: Response) => void = () => undefined
    const requisicoes = stubFetch(() => resposta([]))
    requisicoes.mockImplementation(async (caminho: string) => {
      const url = new URL(caminho, 'http://localhost')
      if (url.pathname.endsWith('/profissionais')) return resposta([])
      return new Promise<Response>((resolver) => {
        liberar = resolver
      })
    })
    renderizar()
    await passar(INTERVALO_ATUALIZACAO_MS * 3)
    expect(consultasDaAgenda(requisicoes)).toHaveLength(1)
    await act(async () => liberar(resposta([agendamento({})])))
    expect(screen.getByText('Marina Souza')).toBeInTheDocument()
  })

  it('mantém os blocos e avisa quando uma atualização falha, e se recupera depois', async () => {
    let falhar = false
    stubFetch(() => (falhar ? resposta({ mensagem: 'Erro.' }, 500) : resposta([agendamento({})])))
    renderizar()
    await passar(0)

    falhar = true
    await passar(INTERVALO_ATUALIZACAO_MS)
    expect(screen.getByText('Marina Souza')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Não foi possível atualizar a agenda')

    falhar = false
    await passar(INTERVALO_ATUALIZACAO_MS)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('para de atualizar quando a tela é fechada', async () => {
    const requisicoes = stubFetch(() => resposta([]))
    renderizar()
    await passar(0)
    cleanup()
    await passar(INTERVALO_ATUALIZACAO_MS * 2)
    expect(consultasDaAgenda(requisicoes)).toHaveLength(1)
  })
})
