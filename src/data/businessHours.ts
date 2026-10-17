import { useEffect, useState } from 'react'

export type HorarioDia = {
  aberto: boolean
  abertura: string
  fechamento: string
}

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
  aberto: indice < 6,
  abertura: '08:00',
  fechamento: indice === 5 ? '10:00' : '12:00',
}))

export function validarHorariosFuncionamento(horarios: HorarioDia[]): string | null {
  if (horarios.length !== nomesDias.length) return 'Preencha os horários dos sete dias da semana.'
  for (const [indice, horario] of horarios.entries()) {
    if (!horario || typeof horario.aberto !== 'boolean') return 'Horários inválidos.'
    if (!horario.aberto) continue
    if (!horaValida.test(horario.abertura) || !horaValida.test(horario.fechamento)) {
      return `Informe abertura e fechamento válidos para ${nomesDias[indice]}.`
    }
    if (horario.aberto && horario.abertura >= horario.fechamento) {
      return `O fechamento de ${nomesDias[indice]} deve ser depois da abertura.`
    }
  }
  return null
}

export function lerHorariosFuncionamento(): HorarioDia[] {
  try {
    const dados: unknown = JSON.parse(localStorage.getItem(chave) ?? 'null')
    if (
      Array.isArray(dados) &&
      dados.length === nomesDias.length &&
      dados.every(
        (dia) =>
          dia &&
          typeof dia.aberto === 'boolean' &&
          typeof dia.abertura === 'string' &&
          typeof dia.fechamento === 'string',
      ) &&
      !validarHorariosFuncionamento(dados)
    ) {
      return dados
    }
  } catch {
    // Dados locais antigos ou indisponíveis retornam para a prévia inicial.
  }
  return horariosPadrao.map((dia) => ({ ...dia }))
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
  return horario.aberto ? `${horario.abertura} às ${horario.fechamento}` : 'Fechado'
}
