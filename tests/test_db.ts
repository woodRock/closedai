import { db } from '../src/services/firebase.js'

async function test() {
  console.log('Testing Firestore connection...')
  try {
    const collections = await db.listCollections()
    console.log(
      'Collections:',
      collections.map((c) => c.id),
    )

    console.log('Writing test doc...')
    await db.collection('test_connection').add({ timestamp: new Date() })
    console.log('Write success!')
  } catch (e) {
    console.error('Connection failed:', e)
  }
}

test().catch(console.error)
