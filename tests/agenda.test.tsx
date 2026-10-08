import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { Agenda } from '../src/features/provider/Provider'
it('filtra os agendamentos pelo profissional selecionado', async () => {
  const user = userEvent.setup()
  render(<Agenda />)
  expect(screen.getByText('Marina Souza')).toBeInTheDocument()
  expect(screen.getByText('Paula Reis')).toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText('Filtrar por profissional'), 'Clara Nunes')
  expect(screen.queryByText('Marina Souza')).not.toBeInTheDocument()
  expect(screen.queryByText('Luana Costa')).not.toBeInTheDocument()
  expect(screen.getByText('Paula Reis')).toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText('Filtrar por profissional'), '')
  expect(screen.getByText('Marina Souza')).toBeInTheDocument()
})
