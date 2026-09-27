import type { Agendamento, Profissional, Servico } from './models'

export const paraChaveData = (data: Date) =>
  data.toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' })

export const adicionarDias = (data: Date, quantidadeDeDias: number) => {
  const novaData = new Date(data)
  novaData.setDate(novaData.getDate() + quantidadeDeDias)
  return novaData
}

export function buscarProfissionaisDoServico(profissionais: Profissional[], idServico: string) {
  return profissionais.filter((profissional) => profissional.idsServicos.includes(idServico))
}

export function buscarHorariosDisponiveis(
  data: string,
  profissional: Profissional,
  servico: Servico,
  agendamentos: Agendamento[],
  servicos: Servico[],
) {
  if (profissional.diasDeFolga.includes(data)) return []

  const dataSelecionada = new Date(`${data}T12:00:00`)
  if (dataSelecionada.getDay() === 0) return []

  const horariosOcupados = agendamentos
    .filter(
      (agendamento) =>
        agendamento.idProfissional === profissional.id &&
        agendamento.inicio.startsWith(data) &&
        agendamento.status !== 'Cancelado',
    )
    .map((agendamento) => ({
      inicio: new Date(agendamento.inicio),
      duracao: servicos.find((item) => item.id === agendamento.idServico)?.duracao ?? 0,
    }))

  const horariosDeTrabalho = [
    '09:00',
    '10:00',
    '11:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
  ]

  return horariosDeTrabalho.filter((horario) => {
    const inicio = new Date(`${data}T${horario}:00`)
    const fim = new Date(inicio.getTime() + servico.duracao * 60000)

    return (
      fim.getHours() < 19 &&
      !horariosOcupados.some(
        (ocupacao) =>
          inicio < new Date(ocupacao.inicio.getTime() + ocupacao.duracao * 60000) &&
          fim > ocupacao.inicio,
      )
    )
  })
}
