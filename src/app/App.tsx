import { useState } from 'react'
import type { FormEvent, PropsWithChildren } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { Agendamento, Disponibilidade, PaginaEstabelecimento } from '../features/booking/Booking'
import { Agenda, Dashboard, LayoutPrestador, ModuloFuturo } from '../features/provider/Provider'
import { Profissionais } from '../features/provider/Professionals'
import { Button, Card, Field, Logo } from '../design-system/ui'
import { Servicos } from '../features/provider/Services'
import { cadastrarEstabelecimento, ErroApi } from '../data/auth'
import { ProvedorAutenticacao } from './AuthContext'
import { useAutenticacao } from './useAutenticacao'
import { caminhos } from './paths'

const modulosFuturos = [
  { caminho: 'clientes', titulo: 'Clientes' },
  { caminho: 'relatorios', titulo: 'Relatórios' },
]

function Autenticacao({ cadastro = false }: { cadastro?: boolean }) {
  const navegar = useNavigate()
  const localizacao = useLocation()
  const { sessao, carregando, autenticar } = useAutenticacao()
  const [email, definirEmail] = useState('')
  const [senha, definirSenha] = useState('')
  const [enviando, definirEnviando] = useState(false)
  const [erro, definirErro] = useState('')
  const [errosCampos, definirErrosCampos] = useState<Record<string, string>>({})

  if (sessao?.role === 'GESTOR') return <Navigate to={caminhos.painel} replace />

  async function enviarFormulario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    definirEnviando(true)
    definirErro('')
    definirErrosCampos({})

    try {
      if (cadastro) {
        const formulario = new FormData(evento.currentTarget)
        await cadastrarEstabelecimento({
          nomeNegocio: String(formulario.get('nomeNegocio')).trim(),
          categoria: String(formulario.get('categoria')).trim(),
          localizacao: String(formulario.get('localizacao')).trim(),
          nomeGestor: String(formulario.get('nomeGestor')).trim(),
          email: email.trim(),
          senha,
        })
        navegar(caminhos.login, { replace: true, state: { cadastroConcluido: true } })
      } else {
        await autenticar(email, senha)
        navegar(caminhos.painel, { replace: true })
      }
    } catch (falha) {
      if (falha instanceof ErroApi) {
        definirErrosCampos(falha.erros)
        definirErro(
          falha.status === 401
            ? 'E-mail ou senha inválidos.'
            : falha.status === 403
              ? 'Não foi possível validar a sessão. Tente novamente.'
              : falha.message,
        )
      } else {
        definirErro(
          falha instanceof Error ? falha.message : 'Não foi possível concluir a solicitação.',
        )
      }
    } finally {
      definirEnviando(false)
    }
  }

  return (
    <main className="auth">
      <Card>
        <Logo />
        <form className="form" onSubmit={(evento) => void enviarFormulario(evento)}>
          <h1>{cadastro ? 'Crie sua conta' : 'Acesse sua conta'}</h1>
          {!cadastro && localizacao.state?.cadastroConcluido && (
            <p className="notice" role="status">
              Conta criada. Entre com seu e-mail e senha.
            </p>
          )}
          {cadastro && (
            <>
              <Field
                name="nomeNegocio"
                label="Nome do negócio"
                maxLength={100}
                error={errosCampos.nomeNegocio}
                required
              />
              <label className="field">
                Categoria
                <select name="categoria" required defaultValue="">
                  <option value="" disabled>
                    Selecione
                  </option>
                  <option>Salão de beleza</option>
                  <option>Clínica de estética</option>
                  <option>Barbearia</option>
                  <option>Outro</option>
                </select>
                {errosCampos.categoria && <small role="alert">{errosCampos.categoria}</small>}
              </label>
              <Field
                name="localizacao"
                label="Localização"
                maxLength={255}
                error={errosCampos.localizacao}
                required
              />
              <Field
                name="nomeGestor"
                label="Nome do gestor"
                maxLength={100}
                error={errosCampos.nomeGestor}
                required
              />
            </>
          )}
          <Field
            name="email"
            label="E-mail"
            type="email"
            maxLength={100}
            value={email}
            onChange={(evento) => definirEmail(evento.target.value)}
            error={errosCampos.email}
            required
          />
          <Field
            name="senha"
            label="Senha"
            type="password"
            minLength={cadastro ? 8 : undefined}
            value={senha}
            onChange={(evento) => definirSenha(evento.target.value)}
            error={errosCampos.senha}
            required
          />
          {erro && (
            <p className="auth-error" role="alert">
              {erro}
            </p>
          )}
          <Button
            className="auth-submit"
            type="submit"
            disabled={enviando || carregando || !email.trim() || !senha}
          >
            {enviando ? 'Aguarde...' : cadastro ? 'Criar conta' : 'Entrar'}
          </Button>
          <p className="muted">
            {cadastro ? 'Já possui conta?' : 'Ainda não tem conta?'}{' '}
            <Link to={cadastro ? caminhos.login : caminhos.cadastro}>
              {cadastro ? 'Entrar' : 'Criar conta'}
            </Link>
          </p>
        </form>
      </Card>
    </main>
  )
}

function RotaProtegida({ children }: PropsWithChildren) {
  const { sessao, carregando } = useAutenticacao()
  if (carregando)
    return (
      <main className="auth" role="status">
        Carregando sessão...
      </main>
    )
  if (sessao?.role !== 'GESTOR') return <Navigate to={caminhos.login} replace />
  return children
}

export function App() {
  return (
    <BrowserRouter>
      <ProvedorAutenticacao>
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
              <RotaProtegida>
                <LayoutPrestador>
                  <Dashboard />
                </LayoutPrestador>
              </RotaProtegida>
            }
          />
          <Route
            path="/painel/agenda"
            element={
              <RotaProtegida>
                <LayoutPrestador>
                  <Agenda />
                </LayoutPrestador>
              </RotaProtegida>
            }
          />
          <Route
            path={caminhos.profissionais}
            element={
              <RotaProtegida>
                <LayoutPrestador>
                  <Profissionais />
                </LayoutPrestador>
              </RotaProtegida>
            }
          />
          <Route
            path={caminhos.servicos}
            element={
              <RotaProtegida>
                <LayoutPrestador>
                  <Servicos />
                </LayoutPrestador>
              </RotaProtegida>
            }
          />
          {modulosFuturos.map(({ caminho, titulo }) => (
            <Route
              key={caminho}
              path={`/painel/${caminho}`}
              element={
                <RotaProtegida>
                  <LayoutPrestador>
                    <ModuloFuturo titulo={titulo} />
                  </LayoutPrestador>
                </RotaProtegida>
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ProvedorAutenticacao>
    </BrowserRouter>
  )
}
