// scripts/setup-admin.ts
import { MongoClient } from 'mongodb';
import * as bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/admin-panel';

async function setupAdmin() {
  let client: MongoClient;
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const usersCollection = db.collection('users');

    // Check if admin exists
    console.log('🔍 Checking for existing admin user...');
    const adminExists = await usersCollection.findOne({ username: 'admin' });
    
    if (!adminExists) {
      // Hash password
      const hashedPassword = '$2a$12$LQv3c1yqBNWR2gkZ2eTMeeL6UXqNH.s.SFqNCf2lo6DGD2Bq3ttQa';
      
      await usersCollection.insertOne({
        username: 'admin',
        password: hashedPassword,
        createdAt: new Date()
      });
      
      console.log('✅ Admin user created successfully');
      console.log('👤 Username: admin');
      console.log('🔑 Password: admin123');
      console.log('⚠️  IMPORTANT: Change this password in production!');
    } else {
      console.log('✅ Admin user already exists');
    }
    
    console.log('🎉 Setup completed successfully!');
    
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error:any) {
    console.error('❌ Setup failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure MongoDB is running on localhost:27017');
      console.log('💡 Or set MONGODB_URI environment variable');
    }
  } finally {
    if (client!) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

setupAdmin();