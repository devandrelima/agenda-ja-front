import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextoAutenticacao } from '../src/app/authState'
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

function stubFetch(tratar: (url: URL) => Response) {
  const requisicoes = vi.fn(async (caminho: string) => tratar(new URL(caminho, 'http://localhost')))
  vi.stubGlobal('fetch', requisicoes)
  return requisicoes
}

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
    expect(requisicoes).toHaveBeenCalledTimes(1)
    const url = new URL(String(requisicoes.mock.calls[0][0]), 'http://localhost')
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
})
