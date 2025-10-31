export type BookingStatus = 'scheduled' | 'confirmed' | 'done' | 'canceled';
export type PaymentMethod = 'cash' | 'transfer';

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  clientName: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  service: Service;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  createdAt: string;
  booking?: Booking;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServicesResponse {
  services: Service[];
}

export interface BookingsResponse {
  bookings: Booking[];
}

export interface PaymentsResponse {
  payments: (Payment & { booking: Booking & { service: Service } })[];
  totalAmount: number;
}

export interface ProductsResponse {
  products: Product[];
}

export interface StatsOverviewResponse {
  todayBookings: Record<BookingStatus, number> & {
    scheduled: number;
    confirmed: number;
    done: number;
    canceled: number;
  };
  monthlyRevenue: number;
  topServices: { serviceId: string; name: string; count: number }[];
  lowStockProducts: number;
}

export interface StatsRevenueResponse {
  series: { date: string; amount: number }[];
}
