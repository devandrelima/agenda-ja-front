import type { AgendaRepository } from './repository'
import type { Appointment, Customer, Establishment, Professional, Service } from '../domain/models'
import { addDays,toDateKey } from '../domain/availability'
const today=toDateKey(addDays(new Date(),1)); const tomorrow=toDateKey(addDays(new Date(),2))
const establishment:Establishment={id:'est-1',name:'Ateliê Aurora',category:'Salão de beleza',address:'Endereço ilustrativo · Centro',rating:4.9,hours:'Seg–Sáb, 9h às 18h'}
const services:Service[]=[{id:'corte',name:'Corte feminino',duration:60,price:75},{id:'escova',name:'Escova',duration:45,price:55},{id:'sobrancelha',name:'Design de sobrancelha',duration:30,price:40}]
const professionals:Professional[]=[{id:'ana',name:'Ana Martins',specialties:['Cortes e visagismo'],serviceIds:['corte','escova'],offDays:[]},{id:'bia',name:'Beatriz Lima',specialties:['Escovas e finalização'],serviceIds:['escova','sobrancelha'],offDays:[tomorrow]},{id:'clara',name:'Clara Nunes',specialties:['Sobrancelhas'],serviceIds:['sobrancelha'],offDays:[]}]
const customers:Customer[]=[{id:'c1',name:'Marina Souza',phone:'(85) 99999-0001',email:'marina@exemplo.com'},{id:'c2',name:'Luana Costa',phone:'(85) 99999-0002',email:'luana@exemplo.com'},{id:'c3',name:'Paula Reis',phone:'(85) 99999-0003',email:'paula@exemplo.com'}]
const appointments:Appointment[]=[{id:'a1',serviceId:'corte',professionalId:'ana',customerId:'c1',start:`${today}T10:00:00`,status:'Confirmado'},{id:'a2',serviceId:'escova',professionalId:'ana',customerId:'c2',start:`${today}T14:00:00`,status:'Aguardando confirmação'},{id:'a3',serviceId:'sobrancelha',professionalId:'clara',customerId:'c3',start:`${tomorrow}T11:00:00`,status:'Confirmado'}]
export const mockRepository:AgendaRepository={getEstablishment:()=>establishment,getServices:()=>services,getProfessionals:()=>professionals,getAppointments:()=>appointments,getCustomers:()=>customers}
