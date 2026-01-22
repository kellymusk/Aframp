import {
  isConnected,
  requestAccess,
  getPublicKey
} from '@stellar/freighter-api';

export async function connectFreighter() {
  const installed = await isConnected();
  if (!installed) {
    throw new Error('Freighter wallet not installed');
  }

  await requestAccess();
  const publicKey = await getPublicKey();

  return publicKey;
}
