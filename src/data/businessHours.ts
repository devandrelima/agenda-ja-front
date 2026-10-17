import { useEffect, useState } from 'react'

export type TurnoNegocio = { inicio: string; fim: string }
export type HorarioDia = { turnos: TurnoNegocio[] }

export const nomesDias = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
] as const

const chave = 'agendaja-demo-horarios-atelie-aurora-v1'
const eventoAtualizacao = 'agendaja:horarios-funcionamento-atualizados'
const horaValida = /^([01]\d|2[0-3]):[0-5]\d$/

export const horariosPadrao: HorarioDia[] = nomesDias.map((_, indice) => ({
  turnos: indice < 6 ? [{ inicio: '08:00', fim: indice === 5 ? '10:00' : '12:00' }] : [],
}))

export function validarHorariosFuncionamento(horarios: HorarioDia[]): string | null {
  if (horarios.length !== nomesDias.length) return 'Preencha os horários dos sete dias da semana.'
  for (const [indice, horario] of horarios.entries()) {
    if (!horario || !Array.isArray(horario.turnos)) return 'Horários inválidos.'
    for (const turno of horario.turnos) {
      if (!turno || !horaValida.test(turno.inicio) || !horaValida.test(turno.fim)) {
        return `Preencha o início e o fim de todos os turnos de ${nomesDias[indice]}.`
      }
      if (turno.inicio >= turno.fim) {
        return `Os turnos de ${nomesDias[indice]} devem começar antes de terminar.`
      }
    }
    const ordenados = [...horario.turnos].sort((a, b) => a.inicio.localeCompare(b.inicio))
    if (
      ordenados.some((turno, posicao) => posicao > 0 && turno.inicio < ordenados[posicao - 1].fim)
    ) {
      return `Há turnos sobrepostos em ${nomesDias[indice]}.`
    }
  }
  return null
}

function converterDadosAntigos(dados: unknown): HorarioDia[] | null {
  if (!Array.isArray(dados) || dados.length !== nomesDias.length) return null
  if (dados.every((dia) => dia && Array.isArray(dia.turnos))) return dados as HorarioDia[]
  if (
    dados.every(
      (dia) =>
        dia &&
        typeof dia.aberto === 'boolean' &&
        typeof dia.abertura === 'string' &&
        typeof dia.fechamento === 'string',
    )
  ) {
    return dados.map((dia) => ({
      turnos: dia.aberto ? [{ inicio: dia.abertura, fim: dia.fechamento }] : [],
    }))
  }
  return null
}

export function lerHorariosFuncionamento(): HorarioDia[] {
  try {
    const dados = converterDadosAntigos(JSON.parse(localStorage.getItem(chave) ?? 'null'))
    if (dados && !validarHorariosFuncionamento(dados)) return dados
  } catch {
    // Dados locais antigos ou indisponíveis retornam para os horários iniciais.
  }
  return horariosPadrao.map((dia) => ({ turnos: dia.turnos.map((turno) => ({ ...turno })) }))
}

export function salvarHorariosFuncionamento(horarios: HorarioDia[]) {
  const erro = validarHorariosFuncionamento(horarios)
  if (erro) throw new Error(erro)
  localStorage.setItem(chave, JSON.stringify(horarios))
  window.dispatchEvent(new Event(eventoAtualizacao))
}

export function useHorariosFuncionamento() {
  const [horarios, definirHorarios] = useState(lerHorariosFuncionamento)

  useEffect(() => {
    const atualizar = () => definirHorarios(lerHorariosFuncionamento())
    const atualizarOutraAba = (evento: StorageEvent) => {
      if (evento.key === chave) atualizar()
    }
    window.addEventListener(eventoAtualizacao, atualizar)
    window.addEventListener('storage', atualizarOutraAba)
    return () => {
      window.removeEventListener(eventoAtualizacao, atualizar)
      window.removeEventListener('storage', atualizarOutraAba)
    }
  }, [])

  return horarios
}

export function resumirHorario(horario: HorarioDia) {
  return horario.turnos.length
    ? [...horario.turnos]
        .sort((a, b) => a.inicio.localeCompare(b.inicio))
        .map((turno) => `${turno.inicio} às ${turno.fim}`)
        .join(' · ')
    : 'Fechado'
}
