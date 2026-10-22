import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { adicionarDias, paraChaveData } from '../src/domain/availability'
import { AgendamentoPublico } from '../src/features/booking/PublicEstablishment'

const caminhoProfissionais = '/api/estabelecimentos/4/servicos/1/profissionais'

// Datas relativas a hoje, como no assistente, para não depender do dia em que o teste roda.
const amanha = paraChaveData(adicionarDias(new Date(), 1))
const rotuloDaData = (data: string) =>
  new Date(`${data}T12:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })

function profissional(id: number, nome: string, dados: Record<string, unknown> = {}) {
  return {
    id,
    nome,
    especialidades: ['Corte feminino'],
    idsServicos: [1],
    diasDeAtendimento: [1, 2, 3, 4, 5, 6, 7],
    diasDeFolga: [],
    estabelecimentoId: 4,
    ...dados,
  }
}

function resposta(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const publicId = 'f8eb95f4-692a-4a9e-8873-fd0cd2b95311'
const caminhoEstabelecimento = `/api/estabelecimentos/publico/${publicId}`
const caminhoServicos = '/api/estabelecimentos/4/servicos'
const caminhoDisponibilidade = '/api/estabelecimentos/4/servicos/1/disponibilidade'

type Rota = () => Response | Promise<Response>

/** Responde às consultas públicas da página e do assistente; `rotas` sobrescreve algumas. */
function stubApi(
  rotas: {
    profissionais?: Rota[]
    disponibilidade?: (parametros: URLSearchParams) => Response
  } = {},
) {
  const profissionais = rotas.profissionais ?? [() => resposta([])]
  const requisicoes = vi.fn(async (caminho: string) => {
    const [rota, consulta = ''] = caminho.split('?')
    if (rota === caminhoEstabelecimento)
      return resposta({ id: 4, publicId, nome: 'Estúdio Brisa', categoria: '', localizacao: '' })
    if (rota === caminhoServicos)
      return resposta([
        { id: 1, nome: 'Corte feminino', duracaoMinutos: 60, valor: 75, estabelecimentoId: 4 },
      ])
    if (rota === caminhoProfissionais)
      return (profissionais.length > 1 ? profissionais.shift()! : profissionais[0])()
    if (rota === caminhoDisponibilidade && rotas.disponibilidade)
      return rotas.disponibilidade(new URLSearchParams(consulta))
    throw new Error(`Rota inesperada: ${caminho}`)
  })
  vi.stubGlobal('fetch', requisicoes)
  return requisicoes
}

function renderizarAgendamento() {
  render(
    <MemoryRouter initialEntries={[`/estabelecimento/${publicId}/agendar/profissional?servico=1`]}>
      <Routes>
        <Route
          path="/estabelecimento/:estabelecimentoId/agendar/profissional"
          element={<AgendamentoPublico />}
        />
        <Route path="/estabelecimento/:estabelecimentoId/agendar" element={<p>Serviços</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Abre a página do profissional com o serviço já escolhido na etapa anterior. */
async function abrirProfissionais() {
  const user = userEvent.setup()
  renderizarAgendamento()
  await screen.findByRole('heading', { name: 'Escolha o profissional' })
  return user
}

async function preencherDadosDoCliente(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
  await user.type(screen.getByLabelText('Nome completo'), 'Paula Reis')
  await user.type(screen.getByLabelText('Telefone / WhatsApp'), '84994291683')
  await user.type(screen.getByLabelText('E-mail'), 'paula@exemplo.com')
  await user.click(screen.getByRole('button', { name: 'Revisar agendamento' }))
}

const horariosPorProfissional: Record<string, string[]> = {
  '7': ['09:00', '09:30'],
  '8': ['14:00'],
}

describe('agendamento de um estabelecimento real', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('busca no backend os profissionais do serviço escolhido', async () => {
    let responder: (valor: Response) => void = () => {}
    const requisicoes = stubApi({
      profissionais: [() => new Promise<Response>((resolver) => (responder = resolver))],
    })
    await abrirProfissionais()
    expect(screen.getByText('Carregando profissionais...')).toHaveAttribute('role', 'status')
    await waitFor(() =>
      expect(requisicoes).toHaveBeenCalledWith(caminhoProfissionais, expect.anything()),
    )
    responder(resposta([profissional(7, 'Lucas Mendes')]))
    expect(await screen.findByRole('button', { name: /lucas mendes/i })).toBeInTheDocument()
  })

  it('volta para a escolha do serviço', async () => {
    stubApi({ profissionais: [() => resposta([profissional(7, 'Lucas Mendes')])] })
    const user = await abrirProfissionais()
    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByText('Serviços')).toBeInTheDocument()
  })

  it('avisa quando nenhum profissional realiza o serviço', async () => {
    stubApi({ profissionais: [() => resposta([])] })
    await abrirProfissionais()
    expect(await screen.findByText('Nenhum profissional atende este serviço.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /qualquer profissional/i })).not.toBeInTheDocument()
  })

  it('permite tentar novamente quando a busca de profissionais falha', async () => {
    stubApi({
      profissionais: [() => resposta({}, 500), () => resposta([profissional(7, 'Lucas Mendes')])],
    })
    const user = await abrirProfissionais()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os profissionais. Tente novamente.',
    )
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('button', { name: /lucas mendes/i })).toBeInTheDocument()
  })

  it('consulta os horários do profissional escolhido', async () => {
    const requisicoes = stubApi({
      profissionais: [
        () => resposta([profissional(7, 'Lucas Mendes'), profissional(8, 'Mariana Alves')]),
      ],
      disponibilidade: (parametros) =>
        resposta(horariosPorProfissional[parametros.get('profissionalId') ?? ''] ?? []),
    })
    const user = await abrirProfissionais()
    await user.click(await screen.findByRole('button', { name: /lucas mendes/i }))
    await user.click(await screen.findByRole('button', { name: rotuloDaData(amanha) }))
    expect(await screen.findByRole('button', { name: '09:30' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '14:00' })).not.toBeInTheDocument()
    expect(requisicoes).toHaveBeenCalledWith(
      `${caminhoDisponibilidade}?data=${amanha}&profissionalId=7`,
      expect.anything(),
    )
  })

  it('avisa quando não há horários na data', async () => {
    stubApi({
      profissionais: [() => resposta([profissional(7, 'Lucas Mendes')])],
      disponibilidade: () => resposta([]),
    })
    const user = await abrirProfissionais()
    await user.click(await screen.findByRole('button', { name: /lucas mendes/i }))
    await user.click(screen.getByRole('button', { name: rotuloDaData(amanha) }))
    expect(await screen.findByText('Não há horários disponíveis nesta data.')).toBeInTheDocument()
  })

  it('permite tentar novamente quando a busca de horários falha', async () => {
    let falhar = true
    stubApi({
      profissionais: [() => resposta([profissional(7, 'Lucas Mendes')])],
      disponibilidade: () => (falhar ? resposta({}, 500) : resposta(['09:00'])),
    })
    const user = await abrirProfissionais()
    await user.click(await screen.findByRole('button', { name: /lucas mendes/i }))
    await user.click(screen.getByRole('button', { name: rotuloDaData(amanha) }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os horários. Tente novamente.',
    )
    expect(screen.queryByText('Não há horários disponíveis nesta data.')).not.toBeInTheDocument()
    falhar = false
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('button', { name: '09:00' })).toBeInTheDocument()
  })

  it('consulta a agenda de todos e não revela o profissional quando aceita qualquer um', async () => {
    const requisicoes = stubApi({
      profissionais: [
        () => resposta([profissional(7, 'Lucas Mendes'), profissional(8, 'Mariana Alves')]),
      ],
      disponibilidade: (parametros) =>
        resposta(parametros.has('profissionalId') ? [] : ['09:00', '14:00']),
    })
    const user = await abrirProfissionais()
    await user.click(await screen.findByRole('button', { name: /qualquer profissional/i }))
    await user.click(await screen.findByRole('button', { name: rotuloDaData(amanha) }))
    await user.click(await screen.findByRole('button', { name: '14:00' }))
    expect(requisicoes).toHaveBeenCalledWith(
      `${caminhoDisponibilidade}?data=${amanha}`,
      expect.anything(),
    )
    await preencherDadosDoCliente(user)
    expect(screen.getByRole('heading', { name: 'Pedido preparado!' })).toBeInTheDocument()
    expect(screen.getByText('Qualquer profissional')).toBeInTheDocument()
    expect(screen.queryByText('Lucas Mendes')).not.toBeInTheDocument()
    expect(screen.queryByText('Mariana Alves')).not.toBeInTheDocument()
  })

  it('mostra o profissional escolhido na revisão', async () => {
    stubApi({
      profissionais: [() => resposta([profissional(7, 'Lucas Mendes')])],
      disponibilidade: () => resposta(['09:00']),
    })
    const user = await abrirProfissionais()
    await user.click(await screen.findByRole('button', { name: /lucas mendes/i }))
    await user.click(await screen.findByRole('button', { name: rotuloDaData(amanha) }))
    await user.click(await screen.findByRole('button', { name: '09:00' }))
    await preencherDadosDoCliente(user)
    expect(screen.getByText('Lucas Mendes')).toBeInTheDocument()
  })
})
