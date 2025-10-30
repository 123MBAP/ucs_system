import crypto from 'crypto';
import momoConfig from './momoConfig.js';

const b64 = (s) => Buffer.from(s).toString('base64');
const MOMO_DEBUG = String(process.env.MOMO_DEBUG || '').toLowerCase() === 'true';
const readErr = async (r) => {
  try { return await r.json(); } catch { try { return await r.text(); } catch { return null; } }
};

const normalizePhone = (input) => {
  if (!input) return '';
  const digits = String(input).replace(/\D+/g, '');
  const cc = momoConfig.defaultCountryCode.replace(/^\+/, '');
  if (digits.startsWith(cc)) return digits;
  if (digits.startsWith('0')) return cc + digits.slice(1);
  if (digits.length === 9) return cc + digits;
  return digits;
};

const getAccessToken = async () => {
  const url = `${momoConfig.baseUrl}/collection/token/`;
  const auth = `Basic ${b64(`${momoConfig.apiUser}:${momoConfig.apiKey}`)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Ocp-Apim-Subscription-Key': momoConfig.primaryKey,
      'Content-Type': 'application/json',
    },
  });
  if (!r.ok) {
    const body = await readErr(r);
    if (MOMO_DEBUG) console.error('MoMo token error', r.status, body);
    throw new Error(`MoMo token error ${r.status}${body ? `: ${typeof body === 'string' ? body : JSON.stringify(body)}` : ''}`);
  }
  const j = await r.json();
  if (!j.access_token) throw new Error('MoMo token missing');
  return j.access_token;
};

const requestToPay = async ({ amount, currency, phoneNumber, externalId, payerMessage, payeeNote, callbackUrl, referenceId: providedRef }) => {
  const token = await getAccessToken();
  const referenceId = providedRef || crypto.randomUUID();
  const url = `${momoConfig.baseUrl}/collection/v1_0/requesttopay`;
  const body = {
    amount: String(Number(amount || 0)),
    currency: currency || momoConfig.defaultCurrency,
    externalId: externalId || referenceId,
    payer: { partyIdType: 'MSISDN', partyId: normalizePhone(phoneNumber) },
    payerMessage: payerMessage || 'Payment',
    payeeNote: payeeNote || 'Payment',
  };
  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Reference-Id': referenceId,
    'X-Target-Environment': momoConfig.targetEnv,
    'Ocp-Apim-Subscription-Key': momoConfig.primaryKey,
    'Content-Type': 'application/json',
  };
  if (momoConfig.callbackHost || callbackUrl) headers['X-Callback-Url'] = callbackUrl || momoConfig.callbackHost;
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!r.ok) {
    const errBody = await readErr(r);
    if (MOMO_DEBUG) console.error('MoMo requestToPay error', r.status, errBody, 'payload', body, 'headers', { ...headers, Authorization: 'Bearer ***' });
    throw new Error(`MoMo requestToPay error ${r.status}${errBody ? `: ${typeof errBody === 'string' ? errBody : JSON.stringify(errBody)}` : ''}`);
  }
  return { referenceId };
};

const getRequestToPayStatus = async (referenceId) => {
  if (!referenceId) throw new Error('referenceId required');
  const token = await getAccessToken();
  const url = `${momoConfig.baseUrl}/collection/v1_0/requesttopay/${referenceId}`;
  const r = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Target-Environment': momoConfig.targetEnv,
      'Ocp-Apim-Subscription-Key': momoConfig.primaryKey,
      Accept: 'application/json',
    },
  });
  if (!r.ok) {
    const body = await readErr(r);
    if (MOMO_DEBUG) console.error('MoMo status error', r.status, body);
    throw new Error(`MoMo status error ${r.status}${body ? `: ${typeof body === 'string' ? body : JSON.stringify(body)}` : ''}`);
  }
  const j = await r.json();
  return j;
};

export { normalizePhone, getAccessToken, requestToPay, getRequestToPayStatus };
export default { normalizePhone, getAccessToken, requestToPay, getRequestToPayStatus };

