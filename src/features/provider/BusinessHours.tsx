import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { caminhos } from '../../app/paths'
import {
  nomesDias,
  resumirHorario,
  salvarHorariosFuncionamento,
  useHorariosFuncionamento,
  validarHorariosFuncionamento,
} from '../../data/businessHours'
import type { HorarioDia } from '../../data/businessHours'
import { Button, Card } from '../../design-system/ui'

export function HorariosDoNegocio() {
  const horarios = useHorariosFuncionamento()
  const [edicao, definirEdicao] = useState<HorarioDia[] | null>(null)
  const [erro, definirErro] = useState('')
  const [mensagem, definirMensagem] = useState('')

  function alterarDia(indice: number, alteracoes: Partial<HorarioDia>) {
    definirEdicao(
      (atual) =>
        atual?.map((horario, posicao) =>
          posicao === indice ? { ...horario, ...alteracoes } : horario,
        ) ?? null,
    )
    definirErro('')
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
      definirMensagem('Horários atualizados nesta prévia.')
    } catch {
      definirErro('Não foi possível salvar os horários neste navegador.')
    }
  }

  return (
    <Card className="business-hours-card">
      <div className="business-hours-heading">
        <div>
          <h2>Horários de funcionamento</h2>
          <p className="muted">Defina quando o negócio abre e fecha.</p>
        </div>
        {!edicao && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              definirEdicao(horarios.map((dia) => ({ ...dia })))
              definirMensagem('')
            }}
          >
            Editar horários
          </Button>
        )}
      </div>

      {edicao ? (
        <form className="business-hours-form" onSubmit={salvar} noValidate>
          {edicao.map((horario, indice) => (
            <div
              className="business-hours-row"
              role="group"
              aria-label={nomesDias[indice]}
              key={nomesDias[indice]}
            >
              <strong>{nomesDias[indice]}</strong>
              <label className="business-hours-closed">
                <input
                  type="checkbox"
                  checked={!horario.aberto}
                  onChange={(evento) => alterarDia(indice, { aberto: !evento.target.checked })}
                />
                Fechado
              </label>
              <label>
                Abre
                <input
                  type="time"
                  aria-label={`Abertura de ${nomesDias[indice]}`}
                  value={horario.abertura}
                  disabled={!horario.aberto}
                  onChange={(evento) => alterarDia(indice, { abertura: evento.target.value })}
                />
              </label>
              <label>
                Fecha
                <input
                  type="time"
                  aria-label={`Fechamento de ${nomesDias[indice]}`}
                  value={horario.fechamento}
                  disabled={!horario.aberto}
                  onChange={(evento) => alterarDia(indice, { fechamento: evento.target.value })}
                />
              </label>
            </div>
          ))}
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
        <ul className="business-hours-summary">
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
      <p className="business-hours-note">
        Prévia local: estes horários ficam salvos apenas neste navegador até a integração com o
        backend.
      </p>
      <Link className="business-hours-preview" to={caminhos.disponibilidade}>
        Ver página de horários
      </Link>
    </Card>
  )
}
