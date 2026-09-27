import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Agendamento, PaginaEstabelecimento } from '../features/booking/Booking'
import { Agenda, Dashboard, LayoutPrestador, ModuloFuturo } from '../features/provider/Provider'
import { Button, Card, Field, Logo } from '../design-system/ui'
function Autenticacao({ cadastro = false }: { cadastro?: boolean }) {
  return (
    <main className="auth">
      <Card>
        <Logo />
        <form className="form" onSubmit={(e) => e.preventDefault()}>
          <h1>{cadastro ? 'Crie sua conta' : 'Acesse sua conta'}</h1>
          <p className="muted">
            {cadastro
              ? 'O envio real depende da integração com o backend.'
              : 'Modo demonstração: nenhuma senha é armazenada ou validada.'}
          </p>
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
          <Field label="E-mail" type="email" required />
          <Field label="Senha" type="password" required />
          <a className="muted" href="#recuperar">
            Esqueci minha senha
          </a>
          {cadastro ? (
            <Button disabled>Criar conta (aguardando backend)</Button>
          ) : (
            <a href="/painel">
              <Button type="button">Entrar no modo demonstração</Button>
            </a>
          )}
          <p className="muted">
            {cadastro ? 'Já possui conta?' : 'Ainda não tem conta?'}{' '}
            <a href={cadastro ? '/login' : '/cadastro'}>{cadastro ? 'Entrar' : 'Criar conta'}</a>
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
        <Route path="/" element={<PaginaEstabelecimento />} />
        <Route path="/agendar" element={<Agendamento />} />
        <Route path="/login" element={<Autenticacao />} />
        <Route path="/cadastro" element={<Autenticacao cadastro />} />
        <Route
          path="/painel"
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
        {['profissionais', 'servicos', 'clientes', 'relatorios'].map((modulo) => (
          <Route
            key={modulo}
            path={`/painel/${modulo}`}
            element={
              <LayoutPrestador>
                <ModuloFuturo />
              </LayoutPrestador>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
