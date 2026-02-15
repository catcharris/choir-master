
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // 1. Create Users (Admin, Clerk, Part Leaders)
    const users = [
        { username: 'admin', password: '123', role: 'ADMIN', name: 'General Manager' },
        { username: 'clerk', password: '123', role: 'CLERK', name: 'Secretary' },
        { username: 'sopranoA', password: '123', role: 'LEADER', part: 'Soprano A', name: 'Soprano A Leader' },
        { username: 'sopranoB', password: '123', role: 'LEADER', part: 'Soprano B', name: 'Soprano B Leader' },
        { username: 'altoA', password: '123', role: 'LEADER', part: 'Alto A', name: 'Alto A Leader' },
        { username: 'altoB', password: '123', role: 'LEADER', part: 'Alto B', name: 'Alto B Leader' },
        { username: 'tenor', password: '123', role: 'LEADER', part: 'Tenor', name: 'Tenor Leader' },
        { username: 'bass', password: '123', role: 'LEADER', part: 'Bass', name: 'Bass Leader' },
    ]

    for (const user of users) {
        if (user.role === 'ADMIN' || user.role === 'CLERK') {
            await prisma.user.upsert({
                where: { username: user.username },
                update: {},
                create: {
                    username: user.username,
                    password: user.password,
                    role: user.role,
                    name: user.name,
                    part: null
                },
            })
        } else {
            await prisma.user.upsert({
                where: { username: user.username },
                update: {},
                create: {
                    username: user.username,
                    password: user.password,
                    role: user.role,
                    name: user.name,
                    part: user.part
                },
            })
        }
    }

    // 2. Create Dummy Members
    const parts = ['Soprano A', 'Soprano B', 'Alto A', 'Alto B', 'Tenor', 'Bass']
    const roles = ['Regular', 'Soloist', 'New', 'Special']
    const titles = ['Member', 'Deacon', 'Exhorter', 'Elder']

    const dummyMembers = []

    // Create 5 members per part
    for (const part of parts) {
        for (let i = 1; i <= 5; i++) {
            dummyMembers.push({
                name: `${part} Member ${i}`,
                part: part,
                role: i === 1 ? 'Soloist' : 'Regular', // First one is soloist
                churchTitle: titles[i % titles.length],
                phone: '010-1234-5678',
                photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${part}${i}`, // Random avatar
                isActive: true,
            })
        }
    }

    // Create resting member
    await prisma.member.create({
        data: {
            name: 'Resting Member',
            part: 'Soprano A',
            role: 'Resting',
            churchTitle: 'Member',
            phone: '',
            photoUrl: null,
            isActive: false
        }
    })

    for (const member of dummyMembers) {
        await prisma.member.create({
            data: member,
        })
    }

    console.log('Seeding completed!')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
