import dotenv from 'dotenv';

dotenv.config();

const required = [
  'MOMO_BASE_URL',
  'MOMO_API_USER',
  'MOMO_API_KEY',
  'MOMO_PRIMARY_KEY',
  'MOMO_TARGET_ENV',
];

const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
if (missing.length) {
  throw new Error(`Missing required MoMo env vars: ${missing.join(', ')}`);
}

const momoConfig = Object.freeze({
  baseUrl: process.env.MOMO_BASE_URL.replace(/\/$/, ''),
  apiUser: process.env.MOMO_API_USER,
  apiKey: process.env.MOMO_API_KEY,
  primaryKey: process.env.MOMO_PRIMARY_KEY, // Ocp-Apim-Subscription-Key
  targetEnv: process.env.MOMO_TARGET_ENV || 'sandbox',
  callbackHost: process.env.MOMO_CALLBACK_HOST || '',
  defaultCountryCode: process.env.MOMO_DEFAULT_COUNTRY_CODE || '250',
  defaultCurrency: process.env.MOMO_DEFAULT_CURRENCY || 'EUR',
});

export default momoConfig;

