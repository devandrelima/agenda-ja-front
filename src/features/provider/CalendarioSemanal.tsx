import { Fragment } from 'react'
import type { AgendamentoDaAgenda } from '../../data/agenda'
import { Badge } from '../../design-system/ui'
import { rotuloDoStatus } from '../../domain/appointmentStatus'
import { cabecalhoDoDia } from '../../domain/semana'

const PRIMEIRA_HORA = 8
const ULTIMA_HORA = 19

// A data e a hora vêm como texto local (`2026-11-10T14:00:00`); fatiar evita o fuso do navegador.
const chaveDoDia = (momento: string) => momento.slice(0, 10)
const horaDoMomento = (momento: string) => momento.slice(11, 16)

const doisDigitos = (numero: number) => String(numero).padStart(2, '0')

/** Faixa de horas exibida: o expediente padrão, ampliado se algum agendamento ficar de fora. */
function faixaDeHoras(agendamentos: AgendamentoDaAgenda[]) {
  let primeira = PRIMEIRA_HORA
  let ultima = ULTIMA_HORA
  for (const agendamento of agendamentos) {
    const horaDeInicio = Number(horaDoMomento(agendamento.dataHoraInicio).slice(0, 2))
    primeira = Math.min(primeira, horaDeInicio)
    ultima = Math.max(ultima, horaDeInicio + 1)
  }
  return Array.from({ length: ultima - primeira }, (_, indice) => primeira + indice)
}

export function CalendarioSemanal({
  dias,
  hoje,
  agendamentos,
}: {
  /** Chaves `YYYY-MM-DD` das colunas, da primeira à última. */
  dias: string[]
  hoje: string
  agendamentos: AgendamentoDaAgenda[]
}) {
  return (
    <div className="week">
      <div className="week-grid" role="table" aria-label="Agenda da semana">
        <div className="dayhead" role="columnheader">
          Hora
        </div>
        {dias.map((dia) => {
          const { diaDaSemana, diaDoMes, porExtenso } = cabecalhoDoDia(dia)
          return (
            <div
              className={`dayhead${dia === hoje ? ' today' : ''}`}
              key={dia}
              role="columnheader"
              title={porExtenso}
            >
              {diaDaSemana} {diaDoMes}
            </div>
          )
        })}
        {faixaDeHoras(agendamentos).map((hora) => {
          const rotuloDaHora = `${doisDigitos(hora)}:00`
          return (
            <Fragment key={hora}>
              <div className="slot slot-hour" role="rowheader">
                {rotuloDaHora}
              </div>
              {dias.map((dia) => (
                <div className="slot" key={dia} role="cell">
                  {agendamentos
                    .filter(
                      (agendamento) =>
                        chaveDoDia(agendamento.dataHoraInicio) === dia &&
                        horaDoMomento(agendamento.dataHoraInicio).startsWith(doisDigitos(hora)),
                    )
                    .map((agendamento) => (
                      <BlocoDeAgendamento key={agendamento.id} agendamento={agendamento} />
                    ))}
                </div>
              ))}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

function BlocoDeAgendamento({ agendamento }: { agendamento: AgendamentoDaAgenda }) {
  const horario = `${horaDoMomento(agendamento.dataHoraInicio)} – ${horaDoMomento(agendamento.dataHoraFim)}`
  return (
    <div className="agenda-bloco" data-status={agendamento.status}>
      <strong>{agendamento.clienteNome}</strong>
      <span>{agendamento.servicoNome}</span>
      <span className="agenda-bloco-horario">{horario}</span>
      <Badge status={rotuloDoStatus(agendamento.status)} />
    </div>
  )
}
