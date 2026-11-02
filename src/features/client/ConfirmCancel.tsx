import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../design-system/ui'

export function ConfirmarCancelamento({
  estabelecimento,
  aoCancelar,
  aoConfirmar,
}: {
  estabelecimento: string
  aoCancelar: () => void
  aoConfirmar: () => void
}) {
  useEffect(() => {
    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key === 'Escape') aoCancelar()
    }
    document.addEventListener('keydown', fecharComEscape)
    return () => document.removeEventListener('keydown', fecharComEscape)
  }, [aoCancelar])

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoCancelar()
      }}
    >
      <section
        className="card modal client-cancel-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-dialog-title"
        aria-describedby="cancel-dialog-description"
      >
        <h2 id="cancel-dialog-title">Cancelar reserva?</h2>
        <p id="cancel-dialog-description">
          Ao cancelar sua reserva em {estabelecimento}, a data e o horário ficarão disponíveis
          novamente para outra pessoa.
        </p>
        <div className="form-actions">
          <Button type="button" variant="ghost" autoFocus onClick={aoCancelar}>
            Manter reserva
          </Button>
          <Button type="button" className="client-cancel-confirm" onClick={aoConfirmar}>
            Cancelar reserva
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
