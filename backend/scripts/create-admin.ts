import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@gmail.com';
  const password = 'admin123';
  const fullName = 'Super Admin';
  const role = 'ADMIN';

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log('User already exists. Updating role to ADMIN...');
    await prisma.user.update({
      where: { email },
      data: { 
        role: 'ADMIN',
        isVerified: true
      },
    });
  } else {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: 'ADMIN' as any,
        isVerified: true,
      },
    });
    console.log('Admin user created successfully!');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
