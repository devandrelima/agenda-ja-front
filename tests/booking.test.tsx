import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { expect,it } from 'vitest'
import { Booking } from '../src/features/booking/Booking'
it('invalida seleção posterior ao trocar de serviço',async()=>{const user=userEvent.setup();render(<BrowserRouter><Booking/></BrowserRouter>);await user.click(screen.getByRole('button',{name:/corte feminino/i}));await user.click(screen.getByRole('button',{name:/ana martins/i}));await user.click(screen.getByRole('button',{name:/seg/i}));const time=screen.queryByRole('button',{name:'10:00'});if(time) await user.click(time);await user.click(screen.getByRole('button',{name:'Voltar'}));await user.click(screen.getByRole('button',{name:'Voltar'}));await user.click(screen.getByRole('button',{name:/escova/i}));expect(screen.getByText('Escolha o profissional')).toBeInTheDocument()})
