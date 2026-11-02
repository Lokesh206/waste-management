const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const demoUsers = [
  {
    name: 'System Administrator',
    email: 'admin@swms.com',
    phone: '+1-555-0100',
    password: 'admin123',
    role: 'admin',
  },
  {
    name: 'Alex Collector (Team Alpha)',
    email: 'collector@swms.com',
    phone: '+1-555-0101',
    password: 'collector123',
    role: 'collector',
  },
  {
    name: 'Jane Citizen',
    email: 'citizen@swms.com',
    phone: '+1-555-0102',
    password: 'citizen123',
    role: 'citizen',
  },
  {
    name: 'GreenCycle Processing Plant',
    email: 'recycling@swms.com',
    phone: '+1-555-0103',
    password: 'recycling123',
    role: 'recycling_center',
  },
];

async function main() {
  for (const { password, ...user } of demoUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    });

    if (existingUser) {
      console.log(`Preserved existing account: ${user.email}`);
      continue;
    }

    await prisma.user.create({
      data: {
        ...user,
        password_hash: await bcrypt.hash(password, 10),
      },
    });
    console.log(`Created demo account: ${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error('Failed to seed demo accounts:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
