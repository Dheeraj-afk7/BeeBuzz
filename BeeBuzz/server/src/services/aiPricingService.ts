import { spawn } from 'child_process';
import path from 'path';


export interface AIPricingInput {
  distance: number;
  weight: number;
  truckType: string;
  cargoType: string;
  pickupAddress: string;
  deliveryAddress: string;
}

export interface AIPricingResponse {
  success: boolean;
  data?: {
    distanceKm: number;
    weightKg: number;
    demandLevel: string;
    demandSurge: number;
    weatherCondition: string;
    weatherSurge: number;
    fuelPrice: number;
    recommendedPrice: number;
    pricingTiers: {
      fast: { price: number; probability: string; timeEstimate: string };
      balanced: { price: number; probability: string; timeEstimate: string };
      budget: { price: number; probability: string; timeEstimate: string };
    };
    mlMetadata: {
      algorithm: string;
      r2: number;
      mae: number;
      samples: number;
    };
  };
  error?: string;
}

export const getAiPricing = (input: AIPricingInput): Promise<AIPricingResponse> => {
  return new Promise((resolve) => {
    try {
      const pythonScriptPath = path.join(__dirname, 'ai', 'predict.py');
      const pyProcess = spawn('python', [pythonScriptPath]);

      let stdoutData = '';
      let stderrData = '';

      // Feed input arguments as JSON string via standard input (stdin)
      pyProcess.stdin.write(JSON.stringify(input));
      pyProcess.stdin.end();

      pyProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      pyProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      pyProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`predict.py exited with code ${code}. Stderr: ${stderrData}`);
          return resolve(getFallbackPricing(input, `Python exited with code ${code}`));
        }

        try {
          const parsed = JSON.parse(stdoutData.trim());
          if (parsed.success) {
            resolve(parsed);
          } else {
            console.warn('Prediction script returned success=false:', parsed.error);
            resolve(getFallbackPricing(input, parsed.error));
          }
        } catch (e: any) {
          console.error('Failed to parse stdout from predict.py:', e, 'Raw output:', stdoutData);
          resolve(getFallbackPricing(input, 'Failed to parse JSON'));
        }
      });
    } catch (err: any) {
      console.error('Failed to spawn python predictive process:', err);
      resolve(getFallbackPricing(input, err.message));
    }
  });
};

function getFallbackPricing(input: AIPricingInput, reason: string): AIPricingResponse {
  console.log(`Using fallback dynamic pricing. Reason: ${reason}`);
  const distance = input.distance;
  const weight = input.weight;
  
  let rate = 20;
  const type = input.truckType.toLowerCase();
  if (type.includes('pickup')) rate = 15;
  else if (type.includes('mini')) rate = 18;
  else if (type.includes('lorry')) rate = 25;
  else if (type.includes('container')) rate = 35;
  else if (type.includes('flatbed')) rate = 40;
  
  let multiplier = 1.0;
  if (weight > 500) multiplier = 1.1;
  if (weight > 1000) multiplier = 1.25;

  const basePrice = Math.round(distance * rate * multiplier);
  
  return {
    success: true,
    data: {
      distanceKm: distance,
      weightKg: weight,
      demandLevel: 'Standard (Fallback Model)',
      demandSurge: 0.0,
      weatherCondition: 'Clear (Fallback Model)',
      weatherSurge: 0.0,
      fuelPrice: 95.0,
      recommendedPrice: basePrice,
      pricingTiers: {
        fast: {
          price: Math.round(basePrice * 1.12),
          probability: '90%',
          timeEstimate: '15-20 mins'
        },
        balanced: {
          price: basePrice,
          probability: '70%',
          timeEstimate: '45-60 mins'
        },
        budget: {
          price: Math.round(basePrice * 0.88),
          probability: '40%',
          timeEstimate: '2-3 hours'
        }
      },
      mlMetadata: {
        algorithm: 'Heuristic Formula (Fallback Mode)',
        r2: 90.0,
        mae: 500.0,
        samples: 0
      }
    }
  };
}
