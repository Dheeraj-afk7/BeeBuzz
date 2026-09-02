import { v4 as uuidv4 } from 'uuid';

export const paymentGateway = {
  /**
   * Simulates charging the shipper's card/account.
   */
  processPayment: async (amount: number, sourceDetails: any): Promise<string> => {
    // Simulate network delay to make it feel real in the UI
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real app, you would call Stripe/Razorpay here.
    // We return a simulated transaction ID.
    return `txn_mock_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  },

  /**
   * Simulates releasing funds to the driver's bank account.
   */
  initiatePayout: async (amount: number, bankDetails: any): Promise<string> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return a simulated transfer ID
    return `transfer_mock_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  }
};
