import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../design-system/ui'

export function ConfirmarDesativacao({
  aoCancelar,
  aoConfirmar,
  desativando,
  erro,
}: {
  aoCancelar: () => void
  aoConfirmar: () => void
  desativando: boolean
  erro: string
}) {
  useEffect(() => {
    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !desativando) aoCancelar()
    }
    document.addEventListener('keydown', fecharComEscape)
    return () => document.removeEventListener('keydown', fecharComEscape)
  }, [aoCancelar, desativando])

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !desativando) aoCancelar()
      }}
    >
      <section
        className="card modal client-cancel-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deactivate-dialog-title"
        aria-describedby="deactivate-dialog-description"
      >
        <h2 id="deactivate-dialog-title">Desativar conta?</h2>
        <p id="deactivate-dialog-description">
          Suas reservas futuras serão canceladas automaticamente e você não poderá mais entrar com
          este e-mail. Esta ação não pode ser desfeita por aqui.
        </p>
        {erro && (
          <p className="auth-error" role="alert">
            {erro}
          </p>
        )}
        <div className="form-actions">
          <Button type="button" variant="ghost" autoFocus disabled={desativando} onClick={aoCancelar}>
            Manter conta
          </Button>
          <Button type="button" className="client-cancel-confirm" disabled={desativando} onClick={aoConfirmar}>
            {desativando ? 'Desativando...' : 'Desativar conta'}
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
