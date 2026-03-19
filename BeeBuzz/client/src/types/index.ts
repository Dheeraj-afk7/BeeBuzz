export type UserRole = 'shipper' | 'driver' | 'admin';
export type LoadStatus = 'open' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
export type TripStatus = 'pending' | 'accepted' | 'arrived_pickup' | 'loaded' | 'en_route' | 'arrived_delivery' | 'delivered';
export type BidStatus = 'pending' | 'accepted' | 'rejected';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  companyName?: string;
  gstin?: string;
  address?: string;
  profilePhoto?: string;
  licenseNumber?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  documentStatus: 'pending' | 'verified' | 'rejected';
  rating: number;
  totalJobs: number;
  isVerified: boolean;
  createdAt?: string;
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
  shipperName?: string;
  shipperPhone?: string;
  shipperCompany?: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicle?: string;
  driverVehicleNumber?: string;
  bids?: Bid[];
  proofOfDelivery?: any;
  locations?: { lat: number; lng: number; timestamp: string }[];
}

export interface Bid {
  id: string;
  loadId: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  driverTotalJobs: number;
  driverVehicle?: string;
  driverVehicleNumber?: string;
  driverProfilePhoto?: string;
  amount: number;
  notes?: string;
  estimatedArrival?: string;
  status: BidStatus;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  referenceId?: string;
  read: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  loadId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  receiverId: string;
  message: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  loadId: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  status: 'held' | 'released' | 'refunded';
  createdAt: string;
  releasedAt?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  shipperName?: string;
  driverName?: string;
}
