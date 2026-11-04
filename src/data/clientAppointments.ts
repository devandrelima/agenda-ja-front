import { requisitar, tokenCsrf } from './api'

export type StatusDoMeuAgendamento =
  | 'AGUARDANDO_CONFIRMACAO'
  | 'CONFIRMADO'
  | 'CONCLUIDO'
  | 'CANCELADO'

export type MeuAgendamento = {
  id: string
  estabelecimentoId: number
  estabelecimento: string
  servico: string
  profissional: string
  localizacao: string
  publicId: string
  inicio: string
  fim: string
  status: StatusDoMeuAgendamento
  valor: number
}

type MeuAgendamentoApi = {
  id: number
  estabelecimentoId: number
  estabelecimentoPublicId: string
  estabelecimentoNome: string
  estabelecimentoLocalizacao: string
  servicoNome: string
  profissionalNome: string
  dataHoraInicio: string
  dataHoraFim: string
  status: StatusDoMeuAgendamento
  valor: number
}

const caminho = '/api/clientes/me/agendamentos'

function doApi(dados: MeuAgendamentoApi): MeuAgendamento {
  return {
    id: String(dados.id),
    estabelecimentoId: dados.estabelecimentoId,
    estabelecimento: dados.estabelecimentoNome,
    servico: dados.servicoNome,
    profissional: dados.profissionalNome,
    localizacao: dados.estabelecimentoLocalizacao,
    publicId: dados.estabelecimentoPublicId,
    inicio: dados.dataHoraInicio,
    fim: dados.dataHoraFim,
    status: dados.status,
    valor: dados.valor,
  }
}

/** HU18: reservas pertencentes exclusivamente ao cliente autenticado. */
export async function listarMeusAgendamentos(): Promise<MeuAgendamento[]> {
  const resposta = await requisitar(caminho)
  return (await resposta.json() as MeuAgendamentoApi[]).map(doApi)
}

export async function buscarMeuAgendamento(id: string): Promise<MeuAgendamento> {
  const resposta = await requisitar(`${caminho}/${encodeURIComponent(id)}`)
  return doApi(await resposta.json() as MeuAgendamentoApi)
}

export async function confirmarMeuAgendamento(id: string): Promise<MeuAgendamento> {
  const resposta = await requisitar(`${caminho}/${encodeURIComponent(id)}/confirmacao`, {
    method: 'POST',
    headers: { 'X-CSRF-TOKEN': await tokenCsrf() },
  })
  return doApi(await resposta.json() as MeuAgendamentoApi)
}
