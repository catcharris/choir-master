
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latestMember = await prisma.member.findFirst({
    orderBy: { createdAt: 'desc' }, // Assuming createdAt exists, or just id desc
  });
  
  // CreateAt might not exist in schema, let's use ID
  const lastMember = await prisma.member.findFirst({
    orderBy: { id: 'desc' }
  });

  console.log("Latest Member:", lastMember);
  
  if (lastMember?.role === 'New') {
      console.log("✅ SUCCESS: Role is 'New'. Report should count this.");
  } else {
      console.log(`❌ WARNING: Role is '${lastMember?.role}'. Report might NOT count this.`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
