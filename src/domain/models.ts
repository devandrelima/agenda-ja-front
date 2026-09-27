export type BookingStatus='Confirmado'|'Aguardando confirmação'|'Cancelado'
export type Service={id:string;name:string;duration:number;price:number}
export type Professional={id:string;name:string;specialties:string[];serviceIds:string[];offDays:string[]}
export type Establishment={id:string;name:string;category:string;address:string;rating:number;hours:string}
export type Customer={id:string;name:string;phone:string;email:string}
export type Appointment={id:string;serviceId:string;professionalId:string;customerId:string;start:string;status:BookingStatus}
export type BookingChoice={serviceId?:string;professionalId?:string;date?:string;time?:string;customer?:Omit<Customer,'id'>}
