import { describe,expect,it } from 'vitest'
import { mockRepository as repo } from '../src/data/mockRepository'
describe('indicadores do dashboard',()=>it('calcula faturamento somente de agendamentos confirmados',()=>{const services=repo.getServices();const total=repo.getAppointments().filter(a=>a.status==='Confirmado').reduce((sum,a)=>sum+(services.find(s=>s.id===a.serviceId)?.price??0),0);expect(total).toBe(115)}))
