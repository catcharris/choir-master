import { getMonthlyReport } from '@/actions/stats'
import ReportsView from '@/components/ReportsView'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | undefined }>
}

export default async function ReportsPage({ searchParams }: PageProps) {
    const params = await searchParams
    const now = new Date()

    // Default to current year/month if not provided
    const year = params.year ? parseInt(params.year) : now.getFullYear()
    const month = params.month ? parseInt(params.month) : now.getMonth() + 1

    const data = await getMonthlyReport(year, month)

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 pb-20">
            <ReportsView data={data} year={year} month={month} />
        </div>
    )
}
