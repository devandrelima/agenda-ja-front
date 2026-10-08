import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Agendamento, Disponibilidade, PaginaEstabelecimento } from '../features/booking/Booking'
import {
  Agenda,
  Dashboard,
  LayoutPrestador,
  ModuloFuturo,
  Profissionais,
} from '../features/provider/Provider'
import { Button, Card, Field, Logo } from '../design-system/ui'
import { caminhos } from './paths'

const modulosFuturos = [
  { caminho: 'servicos', titulo: 'Serviços' },
  { caminho: 'clientes', titulo: 'Clientes' },
  { caminho: 'relatorios', titulo: 'Relatórios' },
]

function Autenticacao({ cadastro = false }: { cadastro?: boolean }) {
  const navegar = useNavigate()
  const [email, definirEmail] = useState('')
  const [senha, definirSenha] = useState('')
  const podeEntrar = email.trim().length > 0 && senha.length > 0

  return (
    <main className="auth">
      <Card>
        <Logo />
        <form className="form" onSubmit={(e) => e.preventDefault()}>
          <h1>{cadastro ? 'Crie sua conta' : 'Acesse sua conta'}</h1>
          {cadastro && <p className="muted">O envio real depende da integração com o backend.</p>}
          {cadastro && (
            <>
              <Field label="Nome do negócio" required />
              <label className="field">
                Categoria
                <select required>
                  <option value="">Selecione</option>
                  <option>Salão de beleza</option>
                  <option>Clínica de estética</option>
                </select>
              </label>
            </>
          )}
          <Field
            label="E-mail"
            type="email"
            value={email}
            onChange={(evento) => definirEmail(evento.target.value)}
            required
          />
          <Field
            label="Senha"
            type="password"
            value={senha}
            onChange={(evento) => definirSenha(evento.target.value)}
            required
          />
          <a className="muted" href="#recuperar">
            Esqueci minha senha
          </a>
          {cadastro ? (
            <Button disabled>Criar conta</Button>
          ) : (
            <Button
              className="auth-submit"
              type="button"
              disabled={!podeEntrar}
              onClick={() => navegar(caminhos.painel)}
            >
              Entrar
            </Button>
          )}
          <p className="muted">
            {cadastro ? 'Já possui conta?' : 'Ainda não tem conta?'}{' '}
            <a href={cadastro ? caminhos.login : caminhos.cadastro}>
              {cadastro ? 'Entrar' : 'Criar conta'}
            </a>
          </p>
        </form>
      </Card>
    </main>
  )
}
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={caminhos.login} replace />} />
        <Route path={caminhos.login} element={<Autenticacao />} />
        <Route path={caminhos.cadastro} element={<Autenticacao cadastro />} />
        <Route path={caminhos.estabelecimento} element={<PaginaEstabelecimento />} />
        <Route path={caminhos.disponibilidade} element={<Disponibilidade />} />
        <Route path={caminhos.agendamento} element={<Agendamento />} />
        <Route
          path={caminhos.painel}
          element={
            <LayoutPrestador>
              <Dashboard />
            </LayoutPrestador>
          }
        />
        <Route
          path="/painel/agenda"
          element={
            <LayoutPrestador>
              <Agenda />
            </LayoutPrestador>
          }
        />
        <Route
          path={caminhos.profissionais}
          element={
            <LayoutPrestador>
              <Profissionais />
            </LayoutPrestador>
          }
        />
        {modulosFuturos.map(({ caminho, titulo }) => (
          <Route
            key={caminho}
            path={`/painel/${caminho}`}
            element={
              <LayoutPrestador>
                <ModuloFuturo titulo={titulo} />
              </LayoutPrestador>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
