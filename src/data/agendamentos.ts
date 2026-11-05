import { requisitar, tokenCsrf } from './api'
import { listarProfissionais } from './professionals'
import { listarHorariosDisponiveis } from './publicAvailability'
import { listarServicos } from './services'

export type AgendamentoRegistrado = {
  id: number
  servicoId: number
  profissionalId: number
  dataHoraInicio: string
  dataHoraFim: string
  status: string
  valor: number
}

export type NovoAgendamento = {
  servicoId: string
  profissionalId: string
  /** Chave `YYYY-MM-DD` da data. */
  data: string
  /** Horário `HH:mm`. */
  horario: string
}

/**
 * Reserva o horário para o cliente logado. O início vai como data/hora local sem fuso
 * (`2026-11-03T14:00:00`), como o backend e a consulta de disponibilidade usam.
 */
export async function registrarAgendamento(
  estabelecimentoId: string,
  agendamento: NovoAgendamento,
): Promise<AgendamentoRegistrado> {
  const token = await tokenCsrf()
  const resposta = await requisitar(
    `/api/estabelecimentos/${encodeURIComponent(estabelecimentoId)}/agendamentos`,
    {
      method: 'POST',
      headers: { 'X-CSRF-TOKEN': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        servicoId: Number(agendamento.servicoId),
        profissionalId: Number(agendamento.profissionalId),
        dataHoraInicio: `${agendamento.data}T${agendamento.horario}:00`,
      }),
    },
  )
  return resposta.json()
}

export type DetalhesAgendamento = {
  id: number
  estabelecimentoNome: string
  servicoNome: string
  profissionalNome: string
  dataHoraInicio: string
  dataHoraFim: string
  status: string
  valor: number
}

/** Detalhes de uma reserva. Só o cliente dono ou o gestor do estabelecimento podem consultar. */
export async function buscarAgendamento(
  estabelecimentoId: number | string,
  agendamentoId: number | string,
): Promise<DetalhesAgendamento> {
  const resposta = await requisitar(
    `/api/estabelecimentos/${encodeURIComponent(estabelecimentoId)}/agendamentos/${encodeURIComponent(agendamentoId)}`,
  )
  return resposta.json()
}

export type NovoStatusAgendamento = 'CONFIRMADO' | 'CONCLUIDO' | 'CANCELADO'

/** O gestor confirma, conclui ou cancela a reserva. O backend recusa transições inválidas (400). */
export async function alterarStatusAgendamento(
  estabelecimentoId: number | string,
  agendamentoId: number | string,
  status: NovoStatusAgendamento,
): Promise<void> {
  const token = await tokenCsrf()
  await requisitar(
    `/api/admin/estabelecimentos/${encodeURIComponent(estabelecimentoId)}/agendamentos/${encodeURIComponent(agendamentoId)}/status`,
    {
      method: 'PATCH',
      headers: { 'X-CSRF-TOKEN': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
  )
}

/**
 * O gestor move a reserva para outro início (`YYYY-MM-DD` + `HH:mm`, enviado como horário local
 * sem fuso). Se o horário colidir com outra reserva, o backend responde 409.
 */
export async function reagendarAgendamento(
  estabelecimentoId: number | string,
  agendamentoId: number | string,
  data: string,
  horario: string,
): Promise<void> {
  const token = await tokenCsrf()
  await requisitar(
    `/api/admin/estabelecimentos/${encodeURIComponent(estabelecimentoId)}/agendamentos/${encodeURIComponent(agendamentoId)}/horario`,
    {
      method: 'PATCH',
      headers: { 'X-CSRF-TOKEN': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataHoraInicio: `${data}T${horario}:00` }),
    },
  )
}

/** De onde o modal da reserva lê e para onde grava: a API real ou, na demonstração, o mock. */
export type FonteReserva = {
  /** Os dados não vêm do servidor; o modal avisa que são um exemplo. */
  demonstracao?: boolean
  buscar(): Promise<DetalhesAgendamento>
  alterarStatus(status: NovoStatusAgendamento): Promise<void>
  listarHorarios(reserva: DetalhesAgendamento, data: string): Promise<string[]>
  reagendar(data: string, horario: string): Promise<void>
}

/**
 * A consulta da reserva traz só os nomes; os ids vêm do cadastro do estabelecimento. Entre
 * profissionais homônimos, vale o que atende o serviço.
 */
async function descobrirAlvo(estabelecimentoId: number, reserva: DetalhesAgendamento) {
  const [servicos, profissionais] = await Promise.all([
    listarServicos(estabelecimentoId),
    listarProfissionais(estabelecimentoId),
  ])
  const servico = servicos.find((item) => item.nome === reserva.servicoNome)
  const candidatos = profissionais.filter((item) => item.nome === reserva.profissionalNome)
  const profissional =
    candidatos.find((item) => servico && item.idsServicos.includes(servico.id)) ?? candidatos[0]
  if (!servico || !profissional)
    throw new Error('Não foi possível identificar o serviço ou o profissional desta reserva.')
  return { servicoId: String(servico.id), profissionalId: String(profissional.id) }
}

export function criarFonteApi(estabelecimentoId: number, agendamentoId: number): FonteReserva {
  let alvo: ReturnType<typeof descobrirAlvo> | undefined
  return {
    buscar: () => buscarAgendamento(estabelecimentoId, agendamentoId),
    alterarStatus: (status) => alterarStatusAgendamento(estabelecimentoId, agendamentoId, status),
    async listarHorarios(reserva, data) {
      alvo ??= descobrirAlvo(estabelecimentoId, reserva)
      try {
        const { servicoId, profissionalId } = await alvo
        return await listarHorariosDisponiveis(
          String(estabelecimentoId),
          servicoId,
          data,
          profissionalId,
        )
      } catch (falha) {
        alvo = undefined
        throw falha
      }
    },
    reagendar: (data, horario) =>
      reagendarAgendamento(estabelecimentoId, agendamentoId, data, horario),
  }
}
