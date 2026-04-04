import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
  // 1. Tomamos el pooler de tu .env
  const connectionString = process.env.DATABASE_URL;
  
  // 2. Creamos un Pool nativo de Postgres
  const pool = new Pool({ connectionString });
  
  // 3. Lo envolvemos en el adaptador de Prisma
  const adapter = new PrismaPg(pool);
  
  // 4. Le pasamos el adaptador al cliente de Prisma
  return new PrismaClient({ adapter });
};

const globalForPrisma = globalThis;

// Evitamos abrir múltiples conexiones durante el Hot Reload de Next.js
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;