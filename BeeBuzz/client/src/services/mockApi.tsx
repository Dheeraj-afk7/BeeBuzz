// Mock API for development testing
// Replace real API calls with mock responses

// Mock user data storage
const mockUsers: any[] = [];
const mockToken = 'mock-jwt-token-' + Date.now();

// Mock delay to simulate network
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockAuthApi = {
  register: async (data: any) => {
    await delay(500); 
    
    if (!data.email || !data.password || !data.name) {
      throw { response: { data: { error: 'Missing required fields' } } };
    }
    
    const existingUser = mockUsers.find(u => u.email === data.email);
    if (existingUser) {
      throw { response: { data: { error: 'Email already registered' } } };
    }
    
    const newUser = {
      id: 'user-' + Date.now(),
      ...data,
      createdAt: new Date().toISOString()
    };
    mockUsers.push(newUser);
    
    console.log('Mock register:', newUser);
    
    return {
      data: {
        data: {
          token: mockToken,
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role || 'shipper'
          }
        }
      }
    };
  },

  login: async (data: any) => {
    await delay(500);
    
    const user = mockUsers.find(u => u.email === data.email);
    
    if (!user || user.password !== data.password) {
      throw { response: { data: { error: 'Invalid email or password' } } };
    }
    
    return {
      data: {
        data: {
          token: mockToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        }
      }
    };
  },

  getMe: async () => {
    await delay(300);
    
    if (mockUsers.length > 0) {
      return { data: { data: mockUsers[0] } };
    }
    
    throw { response: { data: { error: 'Not authenticated' } } };
  },
  
  updateProfile: async (_data: any) => {
    await delay(300);
    return { data: { success: true } };
  },
  verifyDriver: async (_data: any) => {
    await delay(300);
    return { data: { success: true } };
  },
  payChallan: async (_data: any) => {
    await delay(300);
    return { data: { success: true } };
  },
  uploadDocument: async (_data: any) => {
    await delay(300);
    return { data: { success: true, message: 'Document uploaded (mock)' } };
  }
};

// Mock Loads Storage
const mockLoads: any[] = [
  {
    id: 'load-1',
    pickupAddress: 'Mumbai, Maharashtra',
    deliveryAddress: 'Delhi, NCR',
    cargoType: 'Electronics',
    cargoWeight: 500,
    truckType: 'Tata 407',
    price: 25000,
    status: 'open',
    currentStatus: 'pending',
    pickupDate: '2024-02-01',
    deliveryDate: '2024-02-03',
    createdAt: new Date().toISOString(),
    bids: []
  },
  {
    id: 'load-2',
    pickupAddress: 'Bangalore, Karnataka',
    deliveryAddress: 'Chennai, Tamil Nadu',
    cargoType: 'Furniture',
    cargoWeight: 1000,
    truckType: 'Mahindra Bolero',
    price: 18000,
    status: 'open',
    currentStatus: 'accepted',
    pickupDate: '2024-02-05',
    deliveryDate: '2024-02-06',
    createdAt: new Date().toISOString(),
    bids: []
  }
];

export const mockLoadApi = {
  getAll: async () => {
    await delay(500);
    return { data: { data: mockLoads } };
  },

  getOne: async (id: string) => {
    await delay(300);
    const load = mockLoads.find(l => l.id === id);
    if (!load) throw { response: { data: { error: 'Load not found' } } };
    return { data: { data: load } };
  },

  create: async (data: any) => {
    await delay(500);
    const newLoad = { id: 'load-' + Date.now(), ...data, status: 'open', currentStatus: 'pending', createdAt: new Date().toISOString(), bids: [] };
    mockLoads.push(newLoad);
    return { data: { data: newLoad } };
  },

  update: async (_id: string, _data: any) => {
    await delay(500);
    return { data: { success: true } };
  },

  updateStatus: async (id: string, status: string) => {
    await delay(500);
    const load = mockLoads.find(l => l.id === id);
    if (!load) throw { response: { data: { error: 'Load not found' } } };
    load.currentStatus = status;
    return { data: { data: load } };
  },

  accept: async (id: string) => {
    await delay(500);
    const load = mockLoads.find(l => l.id === id);
    if (!load) throw { response: { data: { error: 'Load not found' } } };
    load.status = 'accepted';
    load.currentStatus = 'accepted';
    return { data: { data: load } };
  },

  cancel: async (id: string) => {
    await delay(500);
    const load = mockLoads.find(l => l.id === id);
    if (!load) throw { response: { data: { error: 'Load not found' } } };
    load.status = 'cancelled';
    return { data: { data: load } };
  },
  
  updateLocation: async (_id: string, _lat: number, _lng?: number) => {
    await delay(300);
    return { data: { success: true } };
  },

  uploadPod: async (id: string, data?: any) => {
    await delay(500);
    const load = mockLoads.find(l => l.id === id);
    if (load) {
      load.status = 'delivered_pending_verification';
      load.currentStatus = 'delivered_pending_verification';
      load.proofOfDelivery = {
        deliveryNotes: data?.notes || 'Delivered successfully',
        recipientName: data?.recipientName || '',
        photos: data?.photos || [],
        submittedAt: new Date().toISOString()
      };
      load.podRejectionComment = null; // clear any previous rejection
    }
    return { data: { success: true } };
  },

  verifyDelivery: async (id: string) => {
    await delay(500);
    const load = mockLoads.find(l => l.id === id);
    if (load) {
      load.status = 'delivered';
      load.currentStatus = 'delivered';
    }
    return { data: { success: true } };
  },

  rejectPod: async (id: string, comment: string) => {
    await delay(500);
    const load = mockLoads.find(l => l.id === id);
    if (load) {
      load.status = 'assigned';
      load.currentStatus = 'arrived_delivery';
      load.podRejectionComment = comment;
      load.proofOfDelivery = null;
    }
    return { data: { success: true } };
  },

  aiPricing: async (data: any) => {
    await delay(300);
    const distanceKm = data.distance || 100;
    const base = Math.round(distanceKm * 25);
    return {
      data: {
        success: true,
        data: {
          distanceKm,
          weightKg: data.weight || 500,
          demandLevel: "Moderate Regional Demand",
          demandSurge: 8.0,
          weatherCondition: "Clear Sky Conditions",
          weatherSurge: 0.0,
          fuelPrice: 94.85,
          recommendedPrice: base,
          pricingTiers: {
            fast: { price: Math.round(base * 1.12), probability: '95%', timeEstimate: '10-15 mins' },
            balanced: { price: base, probability: '75%', timeEstimate: '30-45 mins' },
            budget: { price: Math.round(base * 0.88), probability: '40%', timeEstimate: '2-3 hours' }
          },
          mlMetadata: {
            algorithm: "Random Forest Regressor (Mock Fallback)",
            r2: 98.55,
            mae: 1765.83,
            samples: 5000
          }
        }
      }
    };
  }
};

export const mockPaymentApi = {
  getEarnings: async () => {
    await delay(500);
    return {
      data: {
        data: {
          totalEarnings: 150000,
          pendingAmount: 25000,
          availableBalance: 125000,
          totalJobs: 45,
          transactions: [
            {
              id: 'tx-1',
              amount: 25000,
              platformFee: 2500,
              netAmount: 22500,
              status: 'completed',
              type: 'payment',
              pickupAddress: 'Mumbai',
              deliveryAddress: 'Delhi',
              createdAt: new Date().toISOString()
            },
            {
              id: 'tx-2',
              amount: 18000,
              platformFee: 1800,
              netAmount: 16200,
              status: 'pending',
              type: 'payment',
              pickupAddress: 'Bangalore',
              deliveryAddress: 'Chennai',
              createdAt: new Date(Date.now() - 86400000).toISOString()
            }
          ]
        }
      }
    };
  }
};

export default {
  authApi: mockAuthApi,
  loadApi: mockLoadApi,
  paymentApi: mockPaymentApi
};
