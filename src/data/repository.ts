import type { Appointment, Establishment, Professional, Service, Customer } from '../domain/models'
export interface AgendaRepository { getEstablishment():Establishment; getServices():Service[]; getProfessionals():Professional[]; getAppointments():Appointment[]; getCustomers():Customer[] }
