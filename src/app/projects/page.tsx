import prisma from '@/lib/prisma';
import { authOptions, getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ProjectsTable from '@/components/ProjectsTable';

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      programName: true,
      piName: true,
      startDate: true,
      endDate: true,
    }
  });

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold text-primary tracking-tight">과제 관리</h1>
          <p className="text-[14px] text-gray-500 mt-1">회사 내 모든 R&D 연구개발과제 목록입니다.</p>
        </div>
        <Link href="/projects/new" className="btn btn-primary text-[13px] px-5 py-2.5 flex items-center gap-2 self-start sm:self-auto">
          <i className="fa-solid fa-plus text-[12px]"></i>
          <span>+ 신규 과제 등록</span>
        </Link>
      </div>

      <ProjectsTable projects={projects} />
    </div>
  );
}
