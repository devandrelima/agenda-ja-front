import { useState, type FormEvent } from 'react'
import {
  nomesDias,
  resumirHorario,
  salvarHorariosFuncionamento,
  useHorariosFuncionamento,
  validarHorariosFuncionamento,
} from '../../data/businessHours'
import type { HorarioDia, TurnoNegocio } from '../../data/businessHours'
import { Button, Card } from '../../design-system/ui'

const diasCurtos = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

export function HorariosDoNegocio() {
  const horarios = useHorariosFuncionamento()
  const [edicao, definirEdicao] = useState<HorarioDia[] | null>(null)
  const [erro, definirErro] = useState('')
  const [mensagem, definirMensagem] = useState('')

  function alterarTurnos(indiceDia: number, turnos: TurnoNegocio[]) {
    definirEdicao(
      (atual) =>
        atual?.map((dia, indice) => (indice === indiceDia ? { ...dia, turnos } : dia)) ?? null,
    )
    definirErro('')
  }

  function adicionarTurno(indiceDia: number) {
    if (!edicao) return
    const turnos = edicao[indiceDia].turnos
    const ultimo = turnos.at(-1)
    alterarTurnos(indiceDia, [
      ...turnos,
      { inicio: ultimo ? ultimo.fim : '08:00', fim: ultimo ? '' : '18:00' },
    ])
  }

  function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!edicao) return
    const falha = validarHorariosFuncionamento(edicao)
    if (falha) return definirErro(falha)
    try {
      salvarHorariosFuncionamento(edicao)
      definirEdicao(null)
      definirErro('')
      definirMensagem('Horários atualizados.')
    } catch {
      definirErro('Não foi possível salvar os horários neste navegador.')
    }
  }

  return (
    <Card className="business-hours-card">
      <div className="business-hours-heading">
        <div>
          <h2>Horários de funcionamento</h2>
          <p className="muted">Defina os turnos de funcionamento do negócio.</p>
        </div>
        {!edicao && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              definirEdicao(
                horarios.map((dia) => ({ turnos: dia.turnos.map((turno) => ({ ...turno })) })),
              )
              definirMensagem('')
            }}
          >
            Editar horários
          </Button>
        )}
      </div>

      {edicao ? (
        <form className="business-hours-form" onSubmit={salvar} noValidate>
          <fieldset className="schedule">
            <legend>Turnos do negócio</legend>
            {edicao.map((dia, indiceDia) => (
              <div className="schedule-row" key={nomesDias[indiceDia]}>
                <span className="schedule-day" title={nomesDias[indiceDia]}>
                  {diasCurtos[indiceDia]}
                </span>
                <div className="schedule-items">
                  {dia.turnos.length === 0 && <small className="schedule-empty">Fechado</small>}
                  {dia.turnos.map((turno, indiceTurno) => (
                    <div className="schedule-item" key={indiceTurno}>
                      <input
                        type="time"
                        aria-label={`Início do turno ${indiceTurno + 1} de ${nomesDias[indiceDia]}`}
                        value={turno.inicio}
                        onChange={(evento) =>
                          alterarTurnos(
                            indiceDia,
                            dia.turnos.map((atual, indice) =>
                              indice === indiceTurno
                                ? { ...atual, inicio: evento.target.value }
                                : atual,
                            ),
                          )
                        }
                      />
                      <span>às</span>
                      <input
                        type="time"
                        aria-label={`Fim do turno ${indiceTurno + 1} de ${nomesDias[indiceDia]}`}
                        value={turno.fim}
                        onChange={(evento) =>
                          alterarTurnos(
                            indiceDia,
                            dia.turnos.map((atual, indice) =>
                              indice === indiceTurno
                                ? { ...atual, fim: evento.target.value }
                                : atual,
                            ),
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={`Remover turno ${indiceTurno + 1} de ${nomesDias[indiceDia]}`}
                        onClick={() =>
                          alterarTurnos(
                            indiceDia,
                            dia.turnos.filter((_, indice) => indice !== indiceTurno),
                          )
                        }
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Adicionar turno em ${nomesDias[indiceDia]}`}
                  onClick={() => adicionarTurno(indiceDia)}
                >
                  + turno
                </Button>
              </div>
            ))}
          </fieldset>
          {erro && (
            <p className="auth-error" role="alert">
              {erro}
            </p>
          )}
          <div className="form-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                definirEdicao(null)
                definirErro('')
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">Salvar horários</Button>
          </div>
        </form>
      ) : (
        <ul className="availability-list business-hours-list">
          {horarios.map((horario, indice) => (
            <li key={nomesDias[indice]}>
              <strong>{nomesDias[indice]}</strong>
              <span>{resumirHorario(horario)}</span>
            </li>
          ))}
        </ul>
      )}

      {mensagem && (
        <p className="notice" role="status">
          {mensagem}
        </p>
      )}
    </Card>
  )
}
