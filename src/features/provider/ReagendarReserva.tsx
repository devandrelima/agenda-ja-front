import { useEffect, useState } from 'react'
import { Button } from '../../design-system/ui'
import { reagendarAgendamento, type DetalhesAgendamento } from '../../data/agendamentos'
import { ErroApi } from '../../data/api'
import { listarProfissionais } from '../../data/professionals'
import { listarHorariosDisponiveis } from '../../data/publicAvailability'
import { listarServicos } from '../../data/services'
import { paraChaveData } from '../../domain/availability'
import { mensagemFalhaReserva } from './reservaErros'

type Alvo = { servicoId: string; profissionalId: string }

/**
 * A consulta da reserva traz só os nomes; os ids vêm do cadastro do estabelecimento. Entre
 * profissionais homônimos, vale o que atende o serviço.
 */
async function descobrirAlvo(
  estabelecimentoId: number,
  reserva: DetalhesAgendamento,
): Promise<Alvo> {
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

export function ReagendarReserva({
  estabelecimentoId,
  agendamentoId,
  reserva,
  aoReagendar,
  aoVoltar,
}: {
  estabelecimentoId: number
  agendamentoId: number
  reserva: DetalhesAgendamento
  aoReagendar: () => void
  aoVoltar: () => void
}) {
  const hoje = paraChaveData(new Date())
  const [alvo, definirAlvo] = useState<Alvo | null>(null)
  const [erroCarga, definirErroCarga] = useState('')
  const [tentativa, definirTentativa] = useState(0)
  const [data, definirData] = useState('')
  const [horarios, definirHorarios] = useState<string[] | null>(null)
  const [horario, definirHorario] = useState('')
  const [erro, definirErro] = useState('')
  const [salvando, definirSalvando] = useState(false)

  useEffect(() => {
    let ativo = true
    descobrirAlvo(estabelecimentoId, reserva)
      .then((dados) => {
        if (ativo) definirAlvo(dados)
      })
      .catch((falha) => {
        if (ativo) definirErroCarga(mensagemFalhaReserva(falha))
      })
    return () => {
      ativo = false
    }
  }, [estabelecimentoId, reserva, tentativa])

  useEffect(() => {
    if (!alvo || !data) return
    let ativo = true
    listarHorariosDisponiveis(String(estabelecimentoId), alvo.servicoId, data, alvo.profissionalId)
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
  }, [estabelecimentoId, alvo, data, tentativa])

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
      await reagendarAgendamento(estabelecimentoId, agendamentoId, data, horario)
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

  if (erroCarga)
    return (
      <>
        <p className="auth-error" role="alert">
          {erroCarga}
        </p>
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={aoVoltar}>
            Voltar
          </Button>
          <Button
            type="button"
            onClick={() => {
              definirErroCarga('')
              definirTentativa((atual) => atual + 1)
            }}
          >
            Tentar novamente
          </Button>
        </div>
      </>
    )

  if (!alvo) return <p className="muted">Carregando agenda...</p>

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
