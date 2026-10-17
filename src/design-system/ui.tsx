import { useState } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren } from 'react'
import { formatarTelefone } from '../domain/contact'
import './ui.css'
export function Logo() {
  return (
    <a className="logo" href="/">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4M17 3v4M3 10h18M8 15h4" />
      </svg>
      <span>
        Agenda<strong>Já</strong>
      </span>
    </a>
  )
}
export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
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
  const [mostrarSenha, definirMostrarSenha] = useState(false)
  const senha = props.type === 'password'
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {senha ? (
        <div className="password-input">
          <input id={id} {...props} type={mostrarSenha ? 'text' : 'password'} />
          <button
            className="password-toggle"
            type="button"
            aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={mostrarSenha}
            onClick={() => definirMostrarSenha((atual) => !atual)}
          >
            {mostrarSenha ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 3 21 21M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.3A10.8 10.8 0 0 1 12 5c4.6 0 8.5 2.8 10 7a11 11 0 0 1-3.1 4.4M6.5 6.5A11 11 0 0 0 2 12c1.5 4.2 5.4 7 10 7 1.3 0 2.5-.2 3.6-.7" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 12c1.5-4.2 5.4-7 10-7s8.5 2.8 10 7c-1.5 4.2-5.4 7-10 7S3.5 16.2 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      ) : (
        <input id={id} {...props} />
      )}
      {error && <small role="alert">{error}</small>}
    </div>
  )
}

export function PhoneField({
  label,
  error,
  defaultValue = '',
  onChange,
  ...props
}: {
  label: string
  error?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue'> & {
    defaultValue?: string
  }) {
  const [telefone, definirTelefone] = useState(() => formatarTelefone(defaultValue))
  return (
    <Field
      {...props}
      label={label}
      error={error}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      maxLength={16}
      value={telefone}
      onChange={(evento) => {
        definirTelefone(formatarTelefone(evento.target.value))
        onChange?.(evento)
      }}
    />
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
