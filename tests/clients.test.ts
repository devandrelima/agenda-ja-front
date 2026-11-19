import { expect, it } from 'vitest'
import type { ClienteResumo } from '../src/data/clients'
import { filtrarClientesPorNome, filtrarClientesPorQuantidade, linkWhatsapp, rotuloDeVisitas } from '../src/domain/clients'

const cliente = (id: number, nome: string): ClienteResumo => ({
  id,
  nome,
  telefone: '85999998888',
  totalVisitas: 1,
  ultimaVisita: null,
})
const clientes = [cliente(1, 'Maria José'), cliente(2, 'João Pedro'), cliente(3, 'Mariana Lima')]

it('filtra pelo nome ignorando maiúsculas e acentos', () => {
  expect(filtrarClientesPorNome(clientes, 'maria').map((c) => c.id)).toEqual([1, 3])
  expect(filtrarClientesPorNome(clientes, 'JOAO').map((c) => c.id)).toEqual([2])
  expect(filtrarClientesPorNome(clientes, 'jose').map((c) => c.id)).toEqual([1])
})

it('devolve todos quando a busca está vazia e nenhum quando não há correspondência', () => {
  expect(filtrarClientesPorNome(clientes, '  ')).toHaveLength(3)
  expect(filtrarClientesPorNome(clientes, 'zzz')).toEqual([])
})

it('descreve a contagem de agendamentos no singular e no plural', () => {
  expect(rotuloDeVisitas(0)).toBe('0 agendamentos')
  expect(rotuloDeVisitas(1)).toBe('1 agendamento')
  expect(rotuloDeVisitas(5)).toBe('5 agendamentos')
})

it('monta o link do WhatsApp com o DDI do Brasil', () => {
  expect(linkWhatsapp('85999998888')).toBe('https://wa.me/5585999998888')
  expect(linkWhatsapp('(85) 9 9999-8888')).toBe('https://wa.me/5585999998888')
  expect(linkWhatsapp('5585999998888')).toBe('https://wa.me/5585999998888')
})

it('filtra pela quantidade mínima de agendamentos', () => {
  const lista = [
    { ...cliente(1, 'A'), totalVisitas: 1 },
    { ...cliente(2, 'B'), totalVisitas: 3 },
    { ...cliente(3, 'C'), totalVisitas: 5 },
  ]
  expect(filtrarClientesPorQuantidade(lista, '3').map((c) => c.id)).toEqual([2, 3])
  expect(filtrarClientesPorQuantidade(lista, '6')).toEqual([])
  expect(filtrarClientesPorQuantidade(lista, '0')).toHaveLength(3)
  expect(filtrarClientesPorQuantidade(lista, '')).toHaveLength(3)
})
