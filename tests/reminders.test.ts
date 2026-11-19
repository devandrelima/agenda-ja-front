import { expect, it } from 'vitest'
import { canaisDoCliente, estadoDoLembrete, mensagemDoLembrete } from '../src/domain/reminders'

// 10/11/2026, 10h (horário local)
const agora = new Date(2026, 10, 10, 10, 0, 0)

it('agenda o lembrete para as 8h da véspera de reservas confirmadas e pendentes', () => {
  for (const status of ['CONFIRMADO', 'AGUARDANDO_CONFIRMACAO']) {
    const estado = estadoDoLembrete(status, '2026-11-13T14:00:00', agora)
    expect(estado.tipo).toBe('agendado')
    if (estado.tipo === 'agendado') {
      expect(estado.dataDoEnvio).toEqual(new Date(2026, 10, 12, 8, 0, 0))
    }
  }
})

it('não promete lembrete para reservas canceladas', () => {
  const estado = estadoDoLembrete('CANCELADO', '2026-11-13T14:00:00', agora)
  expect(estado).toEqual({ tipo: 'cancelado' })
  expect(mensagemDoLembrete(estado, { destinatario: 'cliente' })).toBe(
    'Reservas canceladas não recebem lembrete.',
  )
})

it('avisa quando o envio da véspera já passou e o atendimento ainda está por vir', () => {
  // Atendimento amanhã às 14h: o envio era hoje às 8h, antes de "agora".
  const estado = estadoDoLembrete('CONFIRMADO', '2026-11-11T14:00:00', agora)
  expect(estado).toEqual({ tipo: 'perdido' })
  expect(mensagemDoLembrete(estado, { destinatario: 'cliente' })).toMatch(/já passou/)
})

it('não mostra nada para concluídas, atendimentos passados ou datas inválidas', () => {
  expect(estadoDoLembrete('CONCLUIDO', '2026-11-13T14:00:00', agora)).toEqual({ tipo: 'nenhum' })
  expect(estadoDoLembrete('CONFIRMADO', '2026-11-09T14:00:00', agora)).toEqual({ tipo: 'nenhum' })
  expect(estadoDoLembrete('CONFIRMADO', 'invalida', agora)).toEqual({ tipo: 'nenhum' })
  expect(mensagemDoLembrete({ tipo: 'nenhum' }, { destinatario: 'cliente' })).toBeNull()
})

it('escreve a mensagem para o cliente e para o gestor, com o e-mail quando existe', () => {
  const estado = estadoDoLembrete('CONFIRMADO', '2026-11-13T14:00:00', agora)
  expect(mensagemDoLembrete(estado, { destinatario: 'cliente', email: 'ana@exemplo.com' })).toBe(
    'Você receberá um lembrete por e-mail (ana@exemplo.com) na véspera, 12/11, às 8h.',
  )
  expect(mensagemDoLembrete(estado, { destinatario: 'gestor' })).toBe(
    'O cliente receberá um lembrete por e-mail na véspera, 12/11, às 8h.',
  )
})

it('lista só os canais do cliente que existem', () => {
  expect(canaisDoCliente({})).toEqual([])
  expect(canaisDoCliente({ email: ' ', telefone: null })).toEqual([])
  expect(canaisDoCliente({ email: 'ana@exemplo.com', telefone: '(85) 9 9999-8888' })).toEqual([
    { rotulo: 'E-mail', valor: 'ana@exemplo.com', href: 'mailto:ana@exemplo.com' },
    { rotulo: 'Telefone', valor: '(85) 9 9999-8888', href: 'tel:+5585999998888' },
  ])
})
