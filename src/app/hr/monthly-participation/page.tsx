import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import HRMonthlyParticipationTable from '@/components/HRMonthlyParticipationTable';

export default async function HRMonthlyParticipationPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const users = await prisma.user.findMany({
    where: {
      role: { not: 'ADMIN' }
    },
    include: {
      monthlyParticipations: true
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }]
  });

  const projects = await prisma.project.findMany({
    select: { startDate: true, endDate: true }
  });

  const projectYears = new Set<number>();
  projects.forEach(p => {
    if (p.startDate) projectYears.add(new Date(p.startDate).getFullYear());
    if (p.endDate) projectYears.add(new Date(p.endDate).getFullYear());
  });

  return (
    <div className="w-full space-y-6 pb-12">
      <div>
        <h1 className="text-[30px] font-bold text-primary tracking-tight">월별 참여율 조회</h1>
        <p className="text-[14px] text-gray-500 mt-1">
          전체 인력의 월별 합산 참여율을 연차별로 한눈에 확인합니다.
        </p>
      </div>

      <HRMonthlyParticipationTable users={users as any} projectYears={Array.from(projectYears)} />
    </div>
  );
}
