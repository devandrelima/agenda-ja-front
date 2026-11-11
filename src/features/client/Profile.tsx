import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Field, Logo } from '../../design-system/ui'
import { atualizarMeuPerfil, buscarMeuPerfil, desativarMinhaConta, type PerfilCliente } from '../../data/clientProfile'
import { ErroApi } from '../../data/auth'
import { emailValido, formatarTelefone, telefoneValido } from '../../domain/contact'
import { caminhos } from '../../app/paths'
import { useAutenticacao } from '../../app/useAutenticacao'
import { ConfirmarDesativacao } from './ConfirmDeactivate'

const TAMANHO_MAXIMO_FOTO = 5_000_000

function IconePerfil() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.8-4.1 3.5-6.2 8-6.2s7.2 2.1 8 6.2" />
    </svg>
  )
}

export function PerfilCliente() {
  const navegar = useNavigate()
  const { encerrar } = useAutenticacao()
  const campoFoto = useRef<HTMLInputElement>(null)
  const [perfil, definirPerfil] = useState<PerfilCliente>()
  const [nome, definirNome] = useState('')
  const [telefone, definirTelefone] = useState('')
  const [email, definirEmail] = useState('')
  const [fotoUrl, definirFotoUrl] = useState<string | null>(null)
  const [carregando, definirCarregando] = useState(true)
  const [salvando, definirSalvando] = useState(false)
  const [erro, definirErro] = useState('')
  const [aviso, definirAviso] = useState('')
  const [confirmandoDesativacao, definirConfirmandoDesativacao] = useState(false)
  const [desativando, definirDesativando] = useState(false)
  const [erroDesativacao, definirErroDesativacao] = useState('')

  useEffect(() => {
    let ativo = true
    buscarMeuPerfil()
      .then((dados) => {
        if (!ativo) return
        definirPerfil(dados)
        definirNome(dados.nome)
        definirTelefone(formatarTelefone(dados.telefone))
        definirEmail(dados.email)
        definirFotoUrl(dados.fotoUrl)
      })
      .catch((falha) => ativo && definirErro(falha instanceof Error ? falha.message : 'Não foi possível carregar seu perfil.'))
      .finally(() => ativo && definirCarregando(false))
    return () => { ativo = false }
  }, [])

  function selecionarFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return
    if (!arquivo.type.startsWith('image/') || arquivo.size > TAMANHO_MAXIMO_FOTO) {
      definirErro('Escolha uma imagem de até 5 MB.')
      evento.target.value = ''
      return
    }
    const leitor = new FileReader()
    leitor.onload = () => {
      definirFotoUrl(typeof leitor.result === 'string' ? leitor.result : null)
      definirErro('')
    }
    leitor.readAsDataURL(arquivo)
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!perfil) return
    if (!nome.trim()) return definirErro('Informe seu nome completo.')
    if (!telefoneValido(telefone)) return definirErro('Informe um celular válido com DDD.')
    if (!emailValido(email)) return definirErro('Informe um e-mail válido.')

    definirErro('')
    definirAviso('')
    definirSalvando(true)
    try {
      const atualizado = await atualizarMeuPerfil({ nome, telefone, email, fotoUrl })
      definirPerfil(atualizado)
      definirNome(atualizado.nome)
      definirTelefone(formatarTelefone(atualizado.telefone))
      definirEmail(atualizado.email)
      definirFotoUrl(atualizado.fotoUrl)
      if (atualizado.email !== perfil.email) {
        await encerrar()
        navegar(caminhos.login, { replace: true, state: { perfilAtualizado: true } })
        return
      }
      definirAviso('Informações atualizadas com sucesso.')
    } catch (falha) {
      if (falha instanceof ErroApi) definirErro(falha.message)
      else definirErro(falha instanceof Error ? falha.message : 'Não foi possível salvar suas informações.')
    } finally {
      definirSalvando(false)
    }
  }

  async function deslogar() {
    try {
      await encerrar()
      navegar(caminhos.login, { replace: true })
    } catch (falha) {
      definirErro(falha instanceof Error ? falha.message : 'Não foi possível sair da conta.')
    }
  }

  async function desativar() {
    definirErroDesativacao('')
    definirDesativando(true)
    try {
      await desativarMinhaConta()
      try {
        await encerrar()
      } catch {
        // a conta já foi desativada; a sessão local é descartada de qualquer forma
      }
      navegar(caminhos.login, { replace: true, state: { contaDesativada: true } })
    } catch (falha) {
      definirErroDesativacao(falha instanceof Error ? falha.message : 'Não foi possível desativar sua conta.')
      definirDesativando(false)
    }
  }

  return (
    <main className="client-appointments-page">
      <section className="client-appointments-shell client-profile-shell" aria-labelledby="client-profile-title">
        <header className="client-appointments-header">
          <Link className="client-back client-profile-back" to={caminhos.meusAgendamentos}>← Voltar</Link>
          <Logo />
        </header>
        <div className="client-profile-intro">
          <h1 id="client-profile-title">Meu perfil</h1>
          <p>Edite suas informações pessoais.</p>
        </div>
        {carregando && <p role="status">Carregando perfil...</p>}
        {!carregando && (
          <form className="form client-profile-form" onSubmit={(evento) => void salvar(evento)}>
            <div className="client-photo-editor">
              <div className="client-profile-avatar" aria-label="Foto de perfil">
                {fotoUrl ? <img src={fotoUrl} alt="Foto de perfil" /> : <IconePerfil />}
              </div>
              <input ref={campoFoto} type="file" accept="image/*" hidden onChange={selecionarFoto} />
              <div className="client-photo-details">
                <strong>Foto de perfil</strong>
                <small>JPG, PNG ou WebP de até 5 MB.</small>
                <div className="client-photo-actions">
                  <Button type="button" variant="secondary" onClick={() => campoFoto.current?.click()}>{fotoUrl ? 'Trocar foto' : 'Adicionar foto'}</Button>
                  {fotoUrl && <Button type="button" variant="ghost" onClick={() => { definirFotoUrl(null); if (campoFoto.current) campoFoto.current.value = '' }}>Remover</Button>}
                </div>
              </div>
            </div>
            <Field label="Nome completo" name="nome" autoComplete="name" maxLength={100} value={nome} onChange={(evento) => definirNome(evento.target.value)} required />
            <Field label="Telefone/WhatsApp" name="telefone" type="tel" inputMode="numeric" autoComplete="tel" maxLength={16} value={telefone} onChange={(evento) => definirTelefone(formatarTelefone(evento.target.value))} required />
            <Field label="E-mail" name="email" type="email" autoComplete="email" maxLength={100} value={email} onChange={(evento) => definirEmail(evento.target.value)} required />
            {erro && <p className="auth-error" role="alert">{erro}</p>}
            {aviso && <p className="client-appointment-feedback" role="status">{aviso}</p>}
            <Button className="auth-submit" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar alterações'}</Button>
            <Button className="client-logout-button" type="button" variant="ghost" onClick={() => void deslogar()}>Deslogar</Button>
            <Button className="client-deactivate-button" type="button" variant="ghost" onClick={() => { definirErroDesativacao(''); definirConfirmandoDesativacao(true) }}>Desativar minha conta</Button>
          </form>
        )}
      </section>
      {confirmandoDesativacao && (
        <ConfirmarDesativacao
          desativando={desativando}
          erro={erroDesativacao}
          aoCancelar={() => definirConfirmandoDesativacao(false)}
          aoConfirmar={() => void desativar()}
        />
      )}
    </main>
  )
}
