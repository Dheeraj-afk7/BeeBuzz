export type UserRole = 'shipper' | 'driver' | 'admin';
export type LoadStatus = 'open' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
export type BidStatus = 'pending' | 'accepted' | 'rejected';
export type TripStatus = 'pending' | 'accepted' | 'arrived_pickup' | 'loaded' | 'en_route' | 'arrived_delivery' | 'delivered';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  role: UserRole;
  companyName?: string;
  gstin?: string;
  address?: string;
  profilePhoto?: string;
  licenseNumber?: string;
  licensePhoto?: string;
  insuranceNumber?: string;
  insurancePhoto?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  rcNumber?: string;
  documentStatus: 'pending' | 'verified' | 'rejected';
  rating: number;
  totalJobs: number;
  isVerified: boolean;
  createdAt: string;
}

export interface Load {
  id: string;
  shipperId: string;
  driverId?: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  cargoType: string;
  cargoWeight: number;
  cargoDimensions?: string;
  truckType: string;
  specialRequirements?: string;
  pickupDate: string;
  deliveryDate: string;
  price: number;
  status: LoadStatus;
  currentStatus: TripStatus;
  bidCount: number;
  createdAt: string;
}

export interface Bid {
  id: string;
  loadId: string;
  driverId: string;
  amount: number;
  notes?: string;
  status: BidStatus;
  estimatedArrival?: string;
  createdAt: string;
}

export interface ProofOfDelivery {
  id: string;
  loadId: string;
  photos: string[];
  signature?: string;
  recipientName?: string;
  deliveryNotes?: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface LocationUpdate {
  id: string;
  loadId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  referenceId?: string;
  read: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  loadId: string;
  shipperId: string;
  driverId: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  status: 'held' | 'released' | 'refunded';
  createdAt: string;
  releasedAt?: string;
}

export interface ChatMessage {
  id: string;
  loadId: string;
  senderId: string;
  receiverId: string;
  message: string;
  createdAt: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}
