import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContextoAutenticacao } from '../src/app/authState'
import { Agendamento } from '../src/features/booking/Booking'

/** HU25-FE02 — seleção de serviço, profissional e horário no fluxo de agendamento (demo). */
function abrir() {
  const user = userEvent.setup()
  render(
    <BrowserRouter>
      <ContextoAutenticacao.Provider
        value={{ sessao: null, carregando: false, autenticar: vi.fn(), encerrar: vi.fn() }}
      >
        <Agendamento />
      </ContextoAutenticacao.Provider>
    </BrowserRouter>,
  )
  return user
}

const resumo = () => screen.getByRole('region', { name: 'Resumo das escolhas' })
const botoesDeData = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('.filters button'))

afterEach(cleanup)

describe('seleção de serviço, profissional e horário', () => {
  it('lista os serviços e começa sem etapas posteriores liberadas', () => {
    abrir()
    expect(screen.getByRole('heading', { name: 'Escolha o serviço' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /corte feminino/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /escova/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir para Profissional' })).toBeDisabled()
  })

  it('mostra só os profissionais aptos ao serviço escolhido', async () => {
    const user = abrir()
    await user.click(screen.getByRole('button', { name: /corte feminino/i }))
    expect(screen.getByRole('heading', { name: 'Escolha o profissional' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ana martins/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /qualquer profissional/i })).toBeInTheDocument()
    expect(resumo()).toHaveTextContent('Corte feminino')
  })

  it('marca o profissional escolhido e abre data e horário', async () => {
    const user = abrir()
    await user.click(screen.getByRole('button', { name: /corte feminino/i }))
    await user.click(screen.getByRole('button', { name: /ana martins/i }))
    expect(screen.getByRole('heading', { name: 'Data e horário' })).toBeInTheDocument()
    expect(resumo()).toHaveTextContent('Ana Martins')
    await user.click(screen.getByRole('button', { name: 'Ir para Profissional' }))
    expect(screen.getByRole('button', { name: /ana martins/i })).toHaveClass('selected')
    expect(screen.getByRole('button', { name: /qualquer profissional/i })).not.toHaveClass(
      'selected',
    )
  })

  it('marca "qualquer profissional" no lugar de um nome específico', async () => {
    const user = abrir()
    await user.click(screen.getByRole('button', { name: /corte feminino/i }))
    await user.click(screen.getByRole('button', { name: /qualquer profissional/i }))
    expect(screen.getByRole('heading', { name: 'Data e horário' })).toBeInTheDocument()
    expect(resumo()).toHaveTextContent('Qualquer profissional')
    await user.click(screen.getByRole('button', { name: 'Ir para Profissional' }))
    expect(screen.getByRole('button', { name: /qualquer profissional/i })).toHaveClass('selected')
    expect(screen.getByRole('button', { name: /ana martins/i })).not.toHaveClass('selected')
  })

  it('escolhe data e horário, marca o horário e avança para os dados', async () => {
    const user = abrir()
    await user.click(screen.getByRole('button', { name: /corte feminino/i }))
    await user.click(screen.getByRole('button', { name: /ana martins/i }))
    const datas = botoesDeData()
    expect(datas.length).toBeGreaterThan(0)
    await user.click(datas[0])
    const grade = document.querySelector<HTMLElement>('.time-grid')!
    const horarios = within(grade).getAllByRole('button')
    expect(horarios.length).toBeGreaterThan(0)
    const escolhido = horarios[0].textContent!
    await user.click(horarios[0])
    expect(screen.getByRole('heading', { name: 'Seus dados' })).toBeInTheDocument()
    expect(resumo()).toHaveTextContent(escolhido)
    await user.click(screen.getByRole('button', { name: 'Ir para Data e horário' }))
    expect(screen.getByRole('button', { name: escolhido })).toHaveClass('selected')
  })

  it('descarta data e horário ao trocar de profissional', async () => {
    const user = abrir()
    await user.click(screen.getByRole('button', { name: /corte feminino/i }))
    await user.click(screen.getByRole('button', { name: /ana martins/i }))
    await user.click(botoesDeData()[0])
    await user.click(within(document.querySelector<HTMLElement>('.time-grid')!).getAllByRole('button')[0])
    await user.click(screen.getByRole('button', { name: 'Ir para Profissional' }))
    await user.click(screen.getByRole('button', { name: /qualquer profissional/i }))
    expect(resumo()).not.toHaveTextContent(/\d{2}:\d{2}/)
    expect(screen.getByRole('button', { name: 'Ir para Seus dados' })).toBeDisabled()
  })
})
