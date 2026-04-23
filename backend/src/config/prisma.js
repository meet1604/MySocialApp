const { PrismaClient } = require('@prisma/client');

// Singleton — prevents multiple PrismaClient instances in development
// (hot-reload creates new modules, this keeps one DB connection pool)
const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Disconnect cleanly on process exit
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
