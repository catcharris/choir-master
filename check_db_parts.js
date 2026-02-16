const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const parts = await prisma.member.groupBy({
        by: ['part'],
        _count: {
            part: true,
        },
    });
    console.log("DB Parts Distribution:", JSON.stringify(parts, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
