import type { Appointment, Professional, Service } from './models'
export const toDateKey=(date:Date)=>date.toLocaleDateString('en-CA',{timeZone:'America/Fortaleza'})
export const addDays=(date:Date,days:number)=>{const result=new Date(date);result.setDate(result.getDate()+days);return result}
export function professionalsForService(professionals:Professional[],serviceId:string){return professionals.filter(p=>p.serviceIds.includes(serviceId))}
export function availableTimes(date:string, professional:Professional, service:Service, appointments:Appointment[], services:Service[]){
 if(professional.offDays.includes(date))return []
 const day=new Date(`${date}T12:00:00`); if(day.getDay()===0)return []
 const occupied=appointments.filter(a=>a.professionalId===professional.id&&a.start.startsWith(date)&&a.status!=='Cancelado').map(a=>({start:new Date(a.start),duration:services.find(s=>s.id===a.serviceId)?.duration??0}))
 return ['09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00'].filter(time=>{const start=new Date(`${date}T${time}:00`);const end=new Date(start.getTime()+service.duration*60000);return end.getHours()<19&&!occupied.some(o=>start<new Date(o.start.getTime()+o.duration*60000)&&end>o.start)})
}
