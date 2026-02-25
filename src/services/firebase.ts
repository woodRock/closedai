import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import pc from 'picocolors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT?.trim()
let app

if (serviceAccountString && serviceAccountString !== '{}') {
  try {
    const serviceAccount = JSON.parse(serviceAccountString)
    if (!serviceAccount.project_id) {
      throw new Error('Service account object is missing "project_id".')
    }
    app = initializeApp({ credential: cert(serviceAccount) })
  } catch (e: any) {
    console.error(pc.red(`❌ FIREBASE_SERVICE_ACCOUNT error: ${e.message}`))
    console.log(pc.yellow('Attempting to initialize with Application Default Credentials...'))
    try {
      app = initializeApp()
    } catch (e2) {
      console.error(pc.red('❌ Failed to initialize Firebase: No valid credentials found.'))
      process.exit(1)
    }
  }
} else {
  try {
    app = initializeApp()
  } catch (e) {
    console.error(pc.red('❌ FIREBASE_SERVICE_ACCOUNT is missing and ADC failed.'))
    process.exit(1)
  }
}

export const db = getFirestore(app)
db.settings({ ignoreUndefinedProperties: true })
export { FieldValue }
