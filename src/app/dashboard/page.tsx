import { getNotices } from '@/actions/notices';
import DashboardContent from '@/components/DashboardContent';

export default async function DashboardPage() {
    const notices = await getNotices();

    return (
        <DashboardContent notices={notices} />
    );
}
export const dynamic = 'force-dynamic'
