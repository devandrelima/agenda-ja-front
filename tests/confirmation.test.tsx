import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PaginaConfirmacaoPublica } from '../src/features/booking/PublicEstablishment'

const publicId = 'f8eb95f4-692a-4a9e-8873-fd0cd2b95311'
const detalhes = {
  id: 31,
  estabelecimentoNome: 'Estúdio Brisa',
  servicoNome: 'Corte feminino',
  profissionalNome: 'Lucas Mendes',
  dataHoraInicio: '2026-11-03T14:00:00',
  dataHoraFim: '2026-11-03T15:00:00',
  status: 'CONFIRMADO',
  valor: 75,
}

function resposta(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubApi(agendamento: () => Response) {
  const requisicoes = vi.fn(async (caminho: string) => {
    if (caminho === `/api/estabelecimentos/publico/${publicId}`)
      return resposta({ id: 4, publicId, nome: 'Estúdio Brisa', categoria: '', localizacao: '' })
    if (caminho === '/api/estabelecimentos/4/agendamentos/31') return agendamento()
    throw new Error(`Rota inesperada: ${caminho}`)
  })
  vi.stubGlobal('fetch', requisicoes)
  return requisicoes
}

function renderizar(caminho = `/estabelecimento/${publicId}/agendamentos/31`, state?: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: caminho, state }]}>
      <Routes>
        <Route
          path="/estabelecimento/:estabelecimentoId/agendamentos/:agendamentoId"
          element={<PaginaConfirmacaoPublica />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('confirmação do agendamento', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('carrega a reserva do backend e mostra o resumo com o valor', async () => {
    const requisicoes = stubApi(() => resposta(detalhes))
    renderizar()
    expect(screen.getByText('Carregando agendamento...')).toHaveAttribute('role', 'status')
    expect(await screen.findByRole('heading', { name: 'Agendamento confirmado!' })).toBeVisible()
    expect(requisicoes).toHaveBeenCalledWith(
      '/api/estabelecimentos/4/agendamentos/31',
      expect.anything(),
    )
    const resumo = within(screen.getByLabelText('Detalhes da reserva'))
    expect(resumo.getByText('Corte feminino')).toBeVisible()
    expect(resumo.getByText('Lucas Mendes')).toBeVisible()
    expect(resumo.getByText('14:00 às 15:00')).toBeVisible()
    expect(resumo.getByText('Confirmado')).toBeVisible()
    expect(resumo.getByText('R$ 75,00')).toBeVisible()
    expect(resumo.queryByText('Cliente')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver meus agendamentos' })).toHaveAttribute(
      'href',
      '/meus-agendamentos',
    )
  })

  it('mostra o nome do cliente quando vem do fluxo de reserva', async () => {
    stubApi(() => resposta(detalhes))
    renderizar(undefined, { nomeCliente: 'Paula Reis' })
    expect(await screen.findByText('Paula Reis')).toBeVisible()
  })

  it('não chama de confirmada uma reserva cancelada', async () => {
    stubApi(() => resposta({ ...detalhes, status: 'CANCELADO' }))
    renderizar()
    expect(await screen.findByRole('heading', { name: 'Detalhes do agendamento' })).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Agendamento confirmado!' }),
    ).not.toBeInTheDocument()
    expect(
      within(screen.getByLabelText('Detalhes da reserva')).getByText('Cancelado'),
    ).toBeVisible()
  })

  it.each([
    [403, 'Você não tem permissão para ver este agendamento.'],
    [404, 'Agendamento não encontrado.'],
    [500, 'Não foi possível carregar o agendamento.'],
  ])('avisa quando a consulta responde %i', async (status, mensagem) => {
    stubApi(() => resposta({}, status))
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent(mensagem)
  })

  it('recusa um link com identificadores inválidos', () => {
    stubApi(() => resposta(detalhes))
    renderizar('/estabelecimento/nao-e-uuid/agendamentos/abc')
    expect(screen.getByRole('alert')).toHaveTextContent('Agendamento não encontrado.')
  })
})
