import prisma from '@/lib/prisma';
import { authOptions, getServerSession } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import ProjectNavTabs from '@/components/ProjectNavTabs';

export default async function ProjectLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const resolvedParams = await params;
  const project = await prisma.project.findUnique({
    where: { id: resolvedParams.id },
    select: {
      id: true,
      title: true,
      titleEn: true,
      status: true,
      programName: true,
      projectNumber: true,
      startDate: true,
      endDate: true
    }
  });

  if (!project) return notFound();

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[13px] text-gray-500">
        <Link href="/projects" className="hover:text-primary transition-colors flex items-center gap-1.5">
          <i className="fa-solid fa-folder-open text-[12px]"></i>
          <span>과제 관리</span>
        </Link>
        <i className="fa-solid fa-chevron-right text-[10px] text-gray-400"></i>
        <span className="font-semibold text-primary truncate max-w-md">{project.title}</span>
      </div>

      {/* Project Master Header Card */}
      <div className="glass-panel p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`badge ${
                  project.status === '진행중' || project.status === 'IN_PROGRESS'
                    ? 'badge-success'
                    : project.status === '계획중'
                    ? 'bg-surface-container text-primary'
                    : 'bg-surface-container text-gray-500'
                }`}
              >
                {project.status}
              </span>
              {project.programName && (
                <span className="text-[12px] bg-surface-container px-2.5 py-0.5 rounded-full text-gray-600 font-medium">
                  {project.programName}
                </span>
              )}
              {project.projectNumber && (
                <span className="text-[12px] text-gray-400 font-mono">
                  #{project.projectNumber}
                </span>
              )}
            </div>

            <h1 className="text-[26px] sm:text-[30px] font-bold text-primary tracking-tight mt-1">
              {project.title}
            </h1>
            {project.titleEn && (
              <p className="text-gray-500 text-[14px] font-normal">{project.titleEn}</p>
            )}
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <Link href="/projects" className="btn btn-secondary text-[13px] px-4 py-2">
              <i className="fa-solid fa-arrow-left mr-1.5"></i>
              과제 목록
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 -mb-6 -mx-6 sm:-mb-8 sm:-mx-8 border-t border-border">
          <ProjectNavTabs projectId={project.id} />
        </div>
      </div>

      {/* Subpage Contents */}
      <div>{children}</div>
    </div>
  );
}
