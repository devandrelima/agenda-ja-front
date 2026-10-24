import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { Agendamento } from '../src/features/booking/Booking'
import { ContextoAutenticacao } from '../src/app/authState'
it('invalida seleção posterior ao trocar de serviço', async () => {
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
  await user.click(screen.getByRole('button', { name: /corte feminino/i }))
  await user.click(screen.getByRole('button', { name: /ana martins/i }))
  await user.click(screen.getByRole('button', { name: /seg/i }))
  const time = screen.queryByRole('button', { name: '10:00' })
  if (time) await user.click(time)
  await user.click(screen.getByRole('button', { name: 'Ir para Serviço' }))
  await user.click(screen.getByRole('button', { name: /escova/i }))
  expect(screen.getByText('Escolha o profissional')).toBeInTheDocument()
  const resumo = screen.getByRole('region', { name: 'Resumo das escolhas' })
  expect(resumo).toHaveTextContent('Escova')
  expect(resumo).not.toHaveTextContent('Ana Martins')
  expect(resumo.querySelector('button')).toBeNull()
})
