// lib/clearWalletConnectCache.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPLICIT_KEYS = [
  'walletconnect',                 // legacy v1
  'walletSession',                 // your own persisted session
  'WALLETCONNECT_DEEPLINK_CHOICE', // deeplink preference
];

const PREFIXES = ['wc@']; // WalletConnect v2 keys

export async function clearWalletConnectCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toDelete = keys.filter(
      (k) => EXPLICIT_KEYS.includes(k) || PREFIXES.some((p) => k.startsWith(p))
    );
    if (toDelete.length) {
      await AsyncStorage.multiRemove(toDelete);
      console.log('🧹 Purged WalletConnect cache keys:', toDelete);
    }
  } catch (err) {
    console.warn('WalletConnect cache purge failed:', err);
  }
}
