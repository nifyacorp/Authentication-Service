import { config } from 'dotenv';
config();

const requiredVars = {
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_NAME: process.env.DB_NAME,
  DB_PORT: process.env.DB_PORT
};

console.log('\nDatabase Configuration Status:');
console.log('-----------------------------');

let missingVars = false;

for (const [key, value] of Object.entries(requiredVars)) {
  const status = value ? '✅ Set' : '❌ Missing';
  const currentValue = value || 'Not set';
  console.log(`${key}: ${status}`);
  console.log(`Current value: ${currentValue}\n`);
  if (!value) missingVars = true;
}

if (missingVars) {
  console.log('\nRequired values from .env.example:');
  console.log('DB_HOST=/cloudsql/delta-entity-447812-p2:us-central1:auth-service-db');
  console.log('DB_USER=auth_service');
  console.log('DB_NAME=auth_db');
  console.log('DB_PORT=5432');
}