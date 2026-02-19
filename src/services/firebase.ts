import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import pc from 'picocolors';
import 'dotenv/config';

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT?.trim() || '{}';
let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountString);
} catch (e) {
  console.error(pc.red('❌ FIREBASE_SERVICE_ACCOUNT is not valid JSON.'));
  process.exit(1);
}

const app = initializeApp({ credential: cert(serviceAccount) });
export const db = getFirestore(app);
export { FieldValue };
