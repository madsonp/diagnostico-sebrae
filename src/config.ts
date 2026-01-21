import dotenv from 'dotenv';
import type { AutomationConfig } from './types.js';

dotenv.config();

export const config: AutomationConfig = {
  url: process.env.SEBRAE_URL || 'https://diagnostico.sebrae.com.br/admin',
  username: process.env.SEBRAE_USERNAME || '',
  password: process.env.SEBRAE_PASSWORD || '',
  headless: process.env.HEADLESS === 'true',
  timeout: parseInt(process.env.TIMEOUT || '30000'),
  slowMo: parseInt(process.env.SLOW_MO || '100'),
};

export function validateConfig(): boolean {
  if (!config.username || !config.password) {
    console.error('❌ Credenciais não configuradas!');
    console.error('Por favor, configure SEBRAE_USERNAME e SEBRAE_PASSWORD no arquivo .env');
    return false;
  }
  return true;
}
