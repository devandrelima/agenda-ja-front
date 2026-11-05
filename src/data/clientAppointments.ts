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

/** HU19: cancela a reserva no servidor e libera o horário. */
export async function cancelarMeuAgendamento(id: string): Promise<MeuAgendamento> {
  const resposta = await requisitar(`${caminho}/${encodeURIComponent(id)}/cancelamento`, {
    method: 'POST',
    headers: { 'X-CSRF-TOKEN': await tokenCsrf() },
  })
  return doApi(await resposta.json() as MeuAgendamentoApi)
}

export type DadosDeReagendamento = {
  estabelecimentoId: string
  servicoId: string
  profissionalId: string
  data: string
  horario: string
}

/** HU19: cria a nova reserva e cancela a anterior numa única transação. */
export async function reagendarMeuAgendamento(
  id: string,
  dados: DadosDeReagendamento,
): Promise<MeuAgendamento> {
  const resposta = await requisitar(`${caminho}/${encodeURIComponent(id)}/reagendamento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': await tokenCsrf() },
    body: JSON.stringify({
      estabelecimentoId: Number(dados.estabelecimentoId),
      servicoId: Number(dados.servicoId),
      profissionalId: Number(dados.profissionalId),
      dataHoraInicio: `${dados.data}T${dados.horario}:00`,
    }),
  })
  return doApi(await resposta.json() as MeuAgendamentoApi)
}
