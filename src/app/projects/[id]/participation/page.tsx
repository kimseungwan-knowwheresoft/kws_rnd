import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound } from 'next/navigation';
import ProjectPersonnelManager from '@/components/ProjectPersonnelManager';

export default async function ProjectParticipationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await params;

  const project = await prisma.project.findUnique({
    where: { id: resolvedParams.id },
    include: {
      assignments: { include: { user: true }, orderBy: { roleInProject: 'asc' } },
      monthlyParticipations: {
        include: { user: true },
        orderBy: [{ yearMonth: 'asc' }, { userId: 'asc' }]
      }
    }
  });

  if (!project) return notFound();

  const isPM = project.assignments.some((a: any) => a.userId === session?.user?.id && (a.roleInProject === 'PM' || a.roleInProject?.includes('PM') || a.roleInProject?.includes('연구책임자')));
  const isAdmin = session?.user?.role === 'ADMIN';
  const isHR = session?.user?.role === 'HR';
  const canEdit = isAdmin || isPM || isHR;

  // All researchers (non-admin) for the add panel
  const allResearchers = await prisma.user.findMany({
    where: { role: { not: 'ADMIN' } },
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, email: true, role: true,
      grossSalary: true, fourInsurances: true,
      nationality: true, affiliation: true, birthDateAndGender: true,
      degree: true, major: true, degreeYear: true, researcherNumber: true
    }
  });

  // Compute distinct years from monthly participations + project date range
  const startYear = project.startDate
    ? new Date(project.startDate).getFullYear()
    : new Date().getFullYear();
  const endYear = project.endDate
    ? new Date(project.endDate).getFullYear()
    : startYear + 2;

  const yearSet = new Set<number>();
  for (let y = startYear; y <= endYear; y++) yearSet.add(y);
  project.monthlyParticipations.forEach((mp: any) => {
    yearSet.add(parseInt(mp.yearMonth.split('-')[0]));
  });
  const distinctYears = Array.from(yearSet).sort((a, b) => a - b);

  // Summary stats
  const totalAssigned = project.assignments.length;
  const avgParticipation = project.assignments.length > 0
    ? (project.assignments.reduce((s: number, a: any) => s + (a.thisProjectRate || 0), 0) / project.assignments.length).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 bg-surface-lowest">
          <div className="text-[12px] font-semibold text-gray-500 uppercase">배정 인력</div>
          <div className="text-[26px] font-extrabold text-primary mt-1">{totalAssigned}
            <span className="text-[14px] font-normal text-gray-500 ml-1">명</span>
          </div>
        </div>
        <div className="glass-panel p-5 bg-surface-lowest">
          <div className="text-[12px] font-semibold text-gray-500 uppercase">평균 참여율</div>
          <div className="text-[26px] font-extrabold text-secondary mt-1">{avgParticipation}
            <span className="text-[14px] font-normal text-gray-500 ml-1">%</span>
          </div>
        </div>
        <div className="glass-panel p-5 bg-surface-lowest">
          <div className="text-[12px] font-semibold text-gray-500 uppercase">월별 참여 기록</div>
          <div className="text-[26px] font-extrabold text-primary mt-1">{project.monthlyParticipations.length}
            <span className="text-[14px] font-normal text-gray-500 ml-1">건</span>
          </div>
        </div>
        <div className="glass-panel p-5 bg-surface-lowest">
          <div className="text-[12px] font-semibold text-gray-500 uppercase">과제 기간</div>
          <div className="text-[14px] font-bold text-primary mt-1 font-mono">
            {startYear} ~ {endYear}년
          </div>
        </div>
      </div>

      {/* Main Personnel Management Panel */}
      <div className="glass-panel p-6 sm:p-8">
        <div className="flex justify-between items-start border-b border-border pb-5 mb-6">
          <div>
            <h2 className="text-[20px] font-bold text-primary flex items-center gap-2.5">
              <i className="fa-solid fa-users-gear text-secondary text-[18px]"></i>
              과제 참여 인력 관리
            </h2>
            <p className="text-[13px] text-gray-500 mt-1">
              연차별로 참여 인력을 관리하고, 월별 참여율·상세 정보를 입력합니다.
            </p>
          </div>
          <span className="badge bg-surface-container text-primary font-bold text-[12px]">
            총 {totalAssigned}명 배정
          </span>
        </div>

        <ProjectPersonnelManager
          projectId={project.id}
          canEdit={canEdit}
          assignments={project.assignments as any}
          monthlyParticipations={project.monthlyParticipations as any}
          allResearchers={allResearchers as any}
          distinctYears={distinctYears}
          startYear={startYear}
        />
      </div>
    </div>
  );
}
