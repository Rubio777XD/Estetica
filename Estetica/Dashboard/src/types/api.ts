export type BookingStatus = 'scheduled' | 'confirmed' | 'done' | 'canceled';
export type PaymentMethod = 'cash' | 'transfer';
export type AssignmentStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string | null;
  imageUrl?: string | null;
  highlights?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  clientName: string;
  clientEmail?: string | null;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes?: string | null;
  assignedEmail?: string | null;
  assignedAt?: string | null;
  performedByName?: string | null;
  amountOverride?: number | null;
  invitedEmails?: string[];
  confirmedEmail?: string | null;
  completedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  service: Service;
  payments?: Payment[];
  assignments?: Assignment[];
  commissions?: Commission[];
}

export interface Assignment {
  id: string;
  bookingId: string;
  email: string;
  status: AssignmentStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  createdAt: string;
  booking?: Booking;
}

export interface Commission {
  id: string;
  bookingId: string;
  percentage: number;
  amount: number;
  assigneeEmail?: string | null;
  createdAt: string;
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

export interface UnassignedBookingsResponse {
  bookings: Booking[];
}

export interface PaymentsResponse {
  payments: (Payment & { booking: Booking & { service: Service } })[];
  totalAmount: number;
}

export interface CommissionRow {
  bookingId: string;
  clientName: string;
  serviceName: string;
  startTime: string;
  assignedEmail?: string | null;
  assignedName?: string | null;
  commissionAssigneeEmail?: string | null;
  commissionAssigneeName?: string | null;
  paymentMethod?: PaymentMethod | null;
  paymentCreatedAt?: string | null;
  amount: number;
  commissionAmount: number;
  commissionPercentage: number;
}

export interface CommissionsResponse {
  rows: CommissionRow[];
  totalAmount: number;
  totalCommission: number;
  collaborators: string[];
}

export interface ProductsResponse {
  products: Product[];
}

export type UserRole = 'ADMIN' | 'EMPLOYEE';

export interface UserSummary {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  createdAt: string;
}

export interface UsersResponse {
  users: UserSummary[];
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
