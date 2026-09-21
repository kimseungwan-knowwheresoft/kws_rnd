import prisma from '@/lib/prisma';
import { authOptions, getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { deleteIP } from '@/app/actions';
import IPTable from '@/components/IPTable';

export default async function IPDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const ips = await prisma.intellectualProperty.findMany({
    orderBy: { registrationDate: 'desc' },
    include: {
      project: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });

  const isAdmin = session.user.role === 'ADMIN';

  // Count by Type
  const counts = ips.reduce((acc: any, ip) => {
    acc[ip.type] = (acc[ip.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-[30px] font-bold text-primary tracking-tight">지식재산권 통합 관리 (IP Management)</h1>
          <p className="text-[14px] text-gray-500 mt-1">회사 내 특허, 논문, GS인증, SW등록 등 연구개발 지식재산권을 체계적으로 관리합니다.</p>
        </div>
        <Link href="/ip/new" className="btn btn-primary text-[13px] px-5 py-2.5 flex items-center gap-2 self-start sm:self-auto">
          <i className="fa-solid fa-plus text-[12px]"></i>
          <span>+ 신규 IP 등록</span>
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        {Object.keys(counts).map(type => (
          <div key={type} className="glass-panel p-4 min-w-[150px] flex justify-between items-center bg-surface-lowest">
            <span className="font-bold text-primary text-[14px]">{type}</span>
            <span className="badge badge-success text-[12px]">
              {counts[type]}건
            </span>
          </div>
        ))}
      </div>

      {/* IP Table with Pagination and Row Count Select */}
      <IPTable ips={ips} isAdmin={isAdmin} onDeleteIP={deleteIP} />
    </div>
  );
}
