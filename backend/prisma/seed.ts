import { PrismaClient, UserRole } from '@prisma/client'; // THÊM UserRole Ở ĐÂY
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
//npx prisma db seed
async function main() {
  console.log('Đang tạo 60 sinh viên ảo...');
  
  const saltRounds = 10;
  // Băm mật khẩu chung 1 lần để tối ưu hiệu suất
  const commonPasswordHash = await bcrypt.hash('Thanh19001234', saltRounds);

  const dummyUsers = Array.from({ length: 60 }).map((_, index) => ({
    id: uuidv4(),
    email: `sinhvien${index + 1}@gmail.com`,
    passwordHash: commonPasswordHash,
    fullName: `Sinh viên Demo ${index + 1}`,
    role: UserRole.STUDENT, // <--- ĐÃ SỬA LỖI Ở ĐÂY
    isVerified: true, // Ép thành true để qua bước duyệt Email
    verificationToken: null,
  }));

  // Insert một lúc 60 user
  const result = await prisma.user.createMany({
    data: dummyUsers,
    skipDuplicates: true, // Bỏ qua nếu email đã tồn tại
  });

  console.log(`Đã tạo thành công ${result.count} sinh viên ảo!`);
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