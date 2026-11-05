import { useEffect, useState } from 'react'
import { Button } from '../../design-system/ui'
import { type DetalhesAgendamento, type FonteReserva } from '../../data/agendamentos'
import { ErroApi } from '../../data/api'
import { paraChaveData } from '../../domain/availability'
import { mensagemFalhaReserva } from './reservaErros'

export function ReagendarReserva({
  fonte,
  reserva,
  aoReagendar,
  aoVoltar,
}: {
  fonte: FonteReserva
  reserva: DetalhesAgendamento
  aoReagendar: () => void
  aoVoltar: () => void
}) {
  const hoje = paraChaveData(new Date())
  const [tentativa, definirTentativa] = useState(0)
  const [data, definirData] = useState('')
  const [horarios, definirHorarios] = useState<string[] | null>(null)
  const [horario, definirHorario] = useState('')
  const [erro, definirErro] = useState('')
  const [salvando, definirSalvando] = useState(false)

  useEffect(() => {
    if (!data) return
    let ativo = true
    fonte
      .listarHorarios(reserva, data)
      .then((lista) => {
        if (ativo) definirHorarios(lista)
      })
      .catch((falha) => {
        if (!ativo) return
        definirHorarios([])
        definirErro(mensagemFalhaReserva(falha))
      })
    return () => {
      ativo = false
    }
  }, [fonte, reserva, data, tentativa])

  function escolherData(nova: string) {
    definirData(nova)
    definirHorarios(null)
    definirHorario('')
    definirErro('')
  }

  async function salvar() {
    if (!data || !horario) return
    definirSalvando(true)
    definirErro('')
    try {
      await fonte.reagendar(data, horario)
      aoReagendar()
    } catch (falha) {
      if (falha instanceof ErroApi && falha.status === 409) {
        definirErro('Esse horário acabou de ser ocupado. Escolha outro horário.')
        definirHorario('')
        definirHorarios(null)
        definirTentativa((atual) => atual + 1)
      } else if (falha instanceof ErroApi && falha.status === 400) {
        definirErro('Esta reserva não pode mais ser reagendada.')
      } else {
        definirErro(mensagemFalhaReserva(falha))
      }
    } finally {
      definirSalvando(false)
    }
  }

  return (
    <>
      <label className="field">
        <span>Nova data</span>
        <input
          type="date"
          min={hoje}
          value={data}
          onChange={(evento) => escolherData(evento.target.value)}
        />
      </label>
      {data && horarios === null && <p className="muted">Buscando horários livres...</p>}
      {horarios?.length === 0 && !erro && (
        <p className="muted">Nenhum horário livre nesta data. Tente outro dia.</p>
      )}
      {!!horarios?.length && (
        <div className="reserva-horarios" role="group" aria-label="Horários livres">
          {horarios.map((livre) => (
            <button
              key={livre}
              type="button"
              className={`button ${livre === horario ? 'primary' : 'secondary'}`}
              aria-pressed={livre === horario}
              onClick={() => definirHorario(livre)}
            >
              {livre}
            </button>
          ))}
        </div>
      )}
      {erro && (
        <p className="auth-error" role="alert">
          {erro}
        </p>
      )}
      <div className="form-actions">
        <Button type="button" variant="ghost" disabled={salvando} onClick={aoVoltar}>
          Voltar
        </Button>
        <Button type="button" disabled={!horario || salvando} onClick={() => void salvar()}>
          Confirmar novo horário
        </Button>
      </div>
    </>
  )
}
