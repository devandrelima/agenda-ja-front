import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren } from 'react'
import './ui.css'
export function Logo() {
  return (
    <a className="logo" href="/">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4M17 3v4M3 10h18M8 15h4" />
      </svg>
      <span>
        agenda<strong>Já</strong>
      </span>
    </a>
  )
}
export function Button({
  children,
  variant = 'primary',
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  return (
    <button className={`button ${variant}`} {...props}>
      {children}
    </button>
  )
}
export function Card({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <section className={`card ${className}`}>{children}</section>
}
export function Field({
  label,
  error,
  ...props
}: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? label.replaceAll(' ', '-')
  return (
    <label className="field" htmlFor={id}>
      {label}
      <input id={id} {...props} />
      {error && <small role="alert">{error}</small>}
    </label>
  )
}
export function Badge({ status }: { status: string }) {
  return <span className={`badge ${status.toLowerCase().replace(' ', '-')}`}>{status}</span>
}
export function Empty({ children }: PropsWithChildren) {
  return <div className="empty">{children}</div>
}
export function Steps({ step }: { step: number }) {
  return (
    <ol className="steps" aria-label="Etapas do agendamento">
      {['Serviço', 'Profissional', 'Data e horário', 'Seus dados', 'Confirmação'].map(
        (label, i) => (
          <li className={i + 1 <= step ? 'active' : ''} key={label}>
            <span>{i + 1}</span>
            {label}
          </li>
        ),
      )}
    </ol>
  )
}
