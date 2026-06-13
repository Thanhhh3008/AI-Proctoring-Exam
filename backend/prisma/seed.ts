import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
//npx prisma db seed
async function main() {
  const saltRounds = 10;
  const commonPasswordHash = await bcrypt.hash('Thanh19001234', saltRounds);

  // ====== TẠO ADMIN ======
  console.log('Đang tạo tài khoản Admin...');
  await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'admin@gmail.com',
      passwordHash: commonPasswordHash,
      fullName: 'Quản trị viên',
      role: UserRole.ADMIN,
      isVerified: true,
      verificationToken: null,
    },
  });
  console.log('✅ Admin: admin@gmail.com / Thanh19001234');

  // ====== TẠO GIẢNG VIÊN ======
  console.log('Đang tạo tài khoản Giảng viên...');
  await prisma.user.upsert({
    where: { email: 'giaovien@gmail.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'giaovien@gmail.com',
      passwordHash: commonPasswordHash,
      fullName: 'Giảng viên Demo',
      role: UserRole.TEACHER,
      isVerified: true,
      verificationToken: null,
    },
  });
  console.log('✅ Giảng viên: giaovien@gmail.com / Thanh19001234');

  // ====== TẠO 60 SINH VIÊN ẢO ======
  console.log('Đang tạo 60 sinh viên ảo...');
  const dummyUsers = Array.from({ length: 60 }).map((_, index) => ({
    id: uuidv4(),
    email: `sinhvien${index + 1}@gmail.com`,
    passwordHash: commonPasswordHash,
    fullName: `Sinh viên Demo ${index + 1}`,
    role: UserRole.STUDENT,
    isVerified: true,
    verificationToken: null,
  }));

  const result = await prisma.user.createMany({
    data: dummyUsers,
    skipDuplicates: true,
  });

  console.log(`✅ Đã tạo ${result.count} sinh viên ảo!`);
  console.log('Tài khoản: sinhvien1@gmail.com -> sinhvien60@gmail.com');
  console.log('Mật khẩu chung: Thanh19001234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });