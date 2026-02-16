import { getMonthlyReport } from './src/actions/stats';

async function test() {
    try {
        const report = await getMonthlyReport(2026, 2);
        console.log('--- Monthly Report Stats ---');
        report.byPart.forEach(p => {
            if (p.part.includes('Alto')) {
                console.log(`Part: ${p.part}, Total: ${p.totalMembers}, Active: ${p.activeMembers}, Rate: ${p.rate}%`);
            }
        });
    } catch (e) {
        console.error(e);
    }
}

test();
