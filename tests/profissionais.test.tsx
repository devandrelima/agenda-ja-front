import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { Profissionais } from '../src/features/provider/Provider'
describe('tela de profissionais', () => {
  afterEach(cleanup)
  it('lista os profissionais do repositório', () => {
    render(<Profissionais />)
    expect(screen.getByText('Ana Martins')).toBeInTheDocument()
    expect(screen.getByText('Beatriz Lima')).toBeInTheDocument()
    expect(screen.getByText('Clara Nunes')).toBeInTheDocument()
  })
  it('adiciona um novo profissional à lista', async () => {
    const user = userEvent.setup()
    render(<Profissionais />)
    await user.click(screen.getByRole('button', { name: 'Novo profissional' }))
    await user.type(screen.getByLabelText('Nome do profissional'), 'Lucas Mendes')
    await user.click(screen.getByRole('checkbox', { name: 'Escova' }))
    await user.click(screen.getByRole('checkbox', { name: 'seg' }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(screen.getByText('Lucas Mendes')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Lucas Mendes adicionado(a) à equipe.')
  })
  it('exige ao menos um serviço', async () => {
    const user = userEvent.setup()
    render(<Profissionais />)
    await user.click(screen.getByRole('button', { name: 'Novo profissional' }))
    await user.type(screen.getByLabelText('Nome do profissional'), 'Lucas Mendes')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Selecione ao menos um serviço.')
  })
  it('edita os serviços de um profissional existente', async () => {
    const user = userEvent.setup()
    render(<Profissionais />)
    await user.click(screen.getByRole('button', { name: 'Ver detalhes de Ana Martins' }))
    expect(screen.getByRole('checkbox', { name: 'Corte feminino' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'dom' })).not.toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: 'Design de sobrancelha' }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(screen.getByRole('status')).toHaveTextContent('Alterações de Ana Martins salvas.')
  })
})
