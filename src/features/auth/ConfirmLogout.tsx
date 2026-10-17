import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../design-system/ui'

export function ConfirmarSaida({
  aoCancelar,
  aoConfirmar,
  saindo,
  erro,
}: {
  aoCancelar: () => void
  aoConfirmar: () => void
  saindo: boolean
  erro: string
}) {
  useEffect(() => {
    if (saindo) return
    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key === 'Escape') aoCancelar()
    }
    document.addEventListener('keydown', fecharComEscape)
    return () => document.removeEventListener('keydown', fecharComEscape)
  }, [aoCancelar, saindo])

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !saindo) aoCancelar()
      }}
    >
      <section
        className="card modal logout-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
      >
        <h2 id="logout-dialog-title">Sair da conta?</h2>
        <p id="logout-dialog-description">Tem certeza de que deseja sair?</p>
        {erro && (
          <p className="auth-error" role="alert">
            {erro}
          </p>
        )}
        <div className="form-actions">
          <Button type="button" variant="ghost" autoFocus disabled={saindo} onClick={aoCancelar}>
            Cancelar
          </Button>
          <Button type="button" disabled={saindo} onClick={aoConfirmar}>
            {saindo ? 'Saindo...' : 'Sair da conta'}
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
