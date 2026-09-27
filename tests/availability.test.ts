import { describe, expect, it } from 'vitest'
import { availableTimes, professionalsForService } from '../src/domain/availability'
import { mockRepository as repo } from '../src/data/mockRepository'
describe('regras de disponibilidade',()=>{const services=repo.getServices(),pro=repo.getProfessionals();it('filtra profissionais aptos ao serviço',()=>expect(professionalsForService(pro,'corte').map(p=>p.id)).toEqual(['ana']));it('remove horário ocupado e respeita folga',()=>{const service=services[0],date=repo.getAppointments()[0].start.slice(0,10);expect(availableTimes(date,pro[0],service,repo.getAppointments(),services)).not.toContain('10:00');const dayOff=pro[1].offDays[0];expect(availableTimes(dayOff,pro[1],services[1],repo.getAppointments(),services)).toEqual([])})})
