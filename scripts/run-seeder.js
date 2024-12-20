// scripts/run-seeder.js
const dotenv = require('dotenv');
const path = require('path');
const DatabaseSeeder = require('./database-seeder');

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runSeeder() {
  // Verify environment variables are loaded
  if (
    !process.env.EXPO_PUBLIC_SUPABASE_URL ||
    !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.error(
      'Missing required environment variables. Please check your .env file.'
    );
    process.exit(1);
  }

  try {
    console.log('Starting database seeding...');

    const seeder = new DatabaseSeeder(
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    );

    await seeder.seedAll();

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

// Run the seeder
runSeeder();
