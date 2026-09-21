import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { deleteProject, assignMember, createProjectEvaluation, deleteEvaluation } from '@/app/actions';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';

export default async function ProjectInfoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await params;
  
  const project = await prisma.project.findUnique({
    where: { id: resolvedParams.id },
    include: {
      assignments: { include: { user: true } },
      evaluations: { orderBy: { date: 'desc' } }
    }
  });

  if (!project) return notFound();

  const allUsers = await prisma.user.findMany({ orderBy: { name: 'asc' } });
  const isPM = project.assignments.some((a: any) => a.userId === session?.user?.id && (a.roleInProject === 'PM' || a.roleInProject?.includes('PM') || a.roleInProject?.includes('연구책임자')));
  const isAdmin = session?.user?.role === 'ADMIN';
  const isHR = session?.user?.role === 'HR';
  const canEdit = isAdmin || isPM || isHR;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* Left 2 Columns: Information & Qualitative Achievements */}
      <div className="xl:col-span-2 space-y-8">
        
        {/* Basic Description & Administration Specs */}
        <div className="glass-panel p-6 sm:p-8">
          <h2 className="text-[20px] font-bold text-primary border-b border-border pb-3 mb-6 flex items-center gap-2.5">
            <i className="fa-solid fa-circle-info text-secondary text-[18px]"></i>
            과제 개요 및 행정 정보
          </h2>

          <div className="mb-8">
            <label className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
              과제 상세 개요
            </label>
            <div className="bg-surface-lowest p-5 rounded-lg border border-border text-gray-700 leading-relaxed text-[15px]">
              {project.description || '등록된 과제 상세 설명이 없습니다.'}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-surface-lowest p-6 rounded-lg border border-border">
            <div>
              <span className="text-[11px] text-gray-500 font-semibold block mb-1">보안등급</span>
              <strong className="text-[14px] text-gray-900 font-medium">{project.securityClass || '일반'}</strong>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 font-semibold block mb-1">선정방식</span>
              <strong className="text-[14px] text-gray-900 font-medium">{project.selectionMethod || '-'}</strong>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 font-semibold block mb-1">연구개발과제번호</span>
              <strong className="text-[14px] text-gray-900 font-mono">{project.projectNumber || '-'}</strong>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 font-semibold block mb-1">중앙행정기관</span>
              <strong className="text-[14px] text-gray-900 font-medium">{project.centralAgency || '-'}</strong>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 font-semibold block mb-1">전문기관</span>
              <strong className="text-[14px] text-gray-900 font-medium">{project.specializedAgency || '-'}</strong>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 font-semibold block mb-1">공고번호</span>
              <strong className="text-[14px] text-gray-900 font-mono">{project.noticeNumber || '-'}</strong>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 font-semibold block mb-1">사업명</span>
              <strong className="text-[14px] text-gray-900 font-medium">{project.programName || '-'}</strong>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 font-semibold block mb-1">내역사업명</span>
              <strong className="text-[14px] text-gray-900 font-medium">{project.subProgramName || '-'}</strong>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 font-semibold block mb-1">총괄과제명</span>
              <strong className="text-[14px] text-gray-900 font-medium">{project.masterTitleKr || '-'}</strong>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 font-semibold block mb-1">과제 시작일</span>
              <strong className="text-[14px] text-gray-900 font-medium">
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}
              </strong>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 font-semibold block mb-1">과제 종료일</span>
              <strong className="text-[14px] text-gray-900 font-medium">
                {project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}
              </strong>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 font-semibold block mb-1">기술분류</span>
              <strong className="text-[14px] text-gray-900 font-medium">
                {project.scienceTechClass || project.ictClass || '-'}
              </strong>
            </div>
          </div>
        </div>

        {/* Lead Agency & PI Details */}
        <div className="glass-panel p-6 sm:p-8">
          <h2 className="text-[20px] font-bold text-primary border-b border-border pb-3 mb-6 flex items-center gap-2.5">
            <i className="fa-solid fa-building text-secondary text-[18px]"></i>
            주관기관 및 연구책임자 정보
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-lowest p-6 rounded-lg border border-border">
            <div className="space-y-3 border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-6">
              <h3 className="text-[14px] font-bold text-primary mb-3">주관연구개발기관</h3>
              <div>
                <span className="text-[11px] text-gray-500 block">기관명</span>
                <strong className="text-[14px] text-gray-900">{project.leadAgency || '-'}</strong>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block">사업자등록번호</span>
                <strong className="text-[14px] text-gray-900 font-mono">{project.leadAgencyBizNo || '-'}</strong>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block">주소</span>
                <strong className="text-[14px] text-gray-900">{project.leadAgencyAddress || '-'}</strong>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block">참여/협력기관</span>
                <strong className="text-[14px] text-gray-900">{project.participatingAgencies || '-'}</strong>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[14px] font-bold text-primary mb-3">연구책임자 (PI)</h3>
              <div>
                <span className="text-[11px] text-gray-500 block">성명 / 직위</span>
                <strong className="text-[14px] text-gray-900">
                  {project.piName || '-'} {project.piTitle ? `(${project.piTitle})` : ''}
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block">국가연구자번호</span>
                <strong className="text-[14px] text-gray-900 font-mono">{project.piNo || '-'}</strong>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block">연락처</span>
                <strong className="text-[14px] text-gray-900 font-mono">
                  {project.piPhone || project.piMobile || '-'}
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-gray-500 block">이메일</span>
                <strong className="text-[14px] text-gray-900 font-mono">{project.piEmail || '-'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Qualitative Achievements */}
        <div className="glass-panel p-6 sm:p-8">
          <div className="flex justify-between items-center border-b border-border pb-3 mb-6">
            <h2 className="text-[20px] font-bold text-primary flex items-center gap-2.5">
              <i className="fa-solid fa-award text-secondary text-[18px]"></i>
              정성평가 실적 (특허, 논문, SW등록 등)
            </h2>
            <span className="badge bg-surface-container text-primary font-bold">
              총 {project.evaluations.length}건
            </span>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase">구분</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase">상세 내용 및 성과</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase">달성일</th>
                  {canEdit && <th className="px-4 py-3 text-[12px] font-semibold text-gray-500 uppercase text-center">관리</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {project.evaluations.map((e: any) => (
                  <tr key={e.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3 text-[13px]">
                      <span className="badge bg-surface-container text-primary font-medium">{e.type}</span>
                    </td>
                    <td className="px-4 py-3 text-[14px] text-primary font-medium">{e.description}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-500">
                      {e.date ? new Date(e.date).toLocaleDateString() : '-'}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-center">
                        <ConfirmDeleteButton
                          action={async () => {
                            'use server';
                            await deleteEvaluation(e.id, project.id);
                          }}
                          message="해당 정성평가 실적을 삭제하시겠습니까?"
                        />
                      </td>
                    )}
                  </tr>
                ))}
                {project.evaluations.length === 0 && (
                  <tr>
                    <td colSpan={canEdit ? 4 : 3} className="px-4 py-8 text-center text-[13px] text-gray-400">
                      등록된 정성평가 실적이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {canEdit && (
            <div className="bg-surface-lowest border border-border p-6 rounded-lg">
              <h3 className="text-[15px] font-bold text-primary mb-4 flex items-center gap-2">
                <i className="fa-solid fa-plus text-secondary text-[12px]"></i>
                신규 성과 실적 등록
              </h3>
              <form action={async (formData) => {
                'use server';
                await createProjectEvaluation(project.id, formData.get('type') as string, formData.get('description') as string, formData.get('date') as string);
              }}>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="text-[12px] font-semibold text-gray-600 block mb-1">구분</label>
                    <select name="type" required className="w-full">
                      <option value="특허등록(국내)">특허등록(국내)</option>
                      <option value="특허등록(해외)">특허등록(해외)</option>
                      <option value="특허출원">특허출원</option>
                      <option value="기술료집행">기술료집행</option>
                      <option value="논문게재">논문게재</option>
                      <option value="SW등록">SW프로그램 등록</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[12px] font-semibold text-gray-600 block mb-1">상세 내용</label>
                    <input type="text" name="description" required placeholder="예: 무결성 검증 관련 핵심 특허 출원" className="w-full" />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-gray-600 block mb-1">달성일</label>
                    <input type="date" name="date" className="w-full" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="btn btn-primary text-[13px] px-6">
                    성과 추가
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

      </div>

      {/* Right Column: Team Members & Danger Zone */}
      <div className="space-y-6">
        {/* Team Card */}
        <div className="glass-panel p-6">
          <h2 className="text-[18px] font-bold text-primary border-b border-border pb-3 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <i className="fa-solid fa-users text-secondary text-[16px]"></i>
              참여 인력 현황
            </span>
            <span className="badge bg-surface-container text-primary text-[12px]">
              {project.assignments.length}명
            </span>
          </h2>

          <ul className="divide-y divide-border">
            {project.assignments.map((a: any) => (
              <li key={a.id} className="py-3 flex justify-between items-center">
                <div>
                  <div className="font-bold text-[14px] text-primary">{a.user.name}</div>
                  <div className="text-[12px] text-gray-400 font-mono">{a.user.email}</div>
                </div>
                <span className={`badge ${
                  (a.roleInProject === 'PM' || a.roleInProject?.includes('PM') || a.roleInProject?.includes('연구책임자'))
                    ? 'badge-success'
                    : 'bg-surface-container text-gray-800'
                }`}>
                  {a.roleInProject === 'PM' ? '과제책임자 (PM)' : (a.roleInProject === 'MEMBER' ? '참여연구원' : (a.roleInProject || '참여연구원'))}
                </span>
              </li>
            ))}
          </ul>

          {isAdmin && (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="text-[13px] font-bold text-gray-800 mb-3">팀원 추가 및 역할 배정</h3>
              <form action={async (formData) => {
                'use server';
                await assignMember(project.id, formData.get('userId') as string, formData.get('roleInProject') as string);
              }} className="space-y-3">
                <select name="userId" required className="w-full text-[13px]">
                  <option value="">-- 연구원 선택 --</option>
                  {allUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="roleInProject"
                    defaultValue="참여연구원"
                    placeholder="과제 내 역할 (예: 연구책임자, 참여연구원 등)"
                    required
                    className="flex-1 text-[13px]"
                  />
                  <button type="submit" className="btn btn-primary text-[13px] px-4 whitespace-nowrap">
                    배정
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        {isAdmin && (
          <div className="bg-[#ffe9ee] rounded-xl border border-tertiary/40 p-6 space-y-3">
            <div className="flex items-center gap-2 text-tertiary font-bold text-[16px]">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>위험 관리 (Danger Zone)</span>
            </div>
            <p className="text-[13px] text-tertiary leading-relaxed">
              과제를 영구 삭제하면 배정된 참여 인력 내역 및 모든 연차별 예산 정보가 영구 소멸됩니다.
            </p>
            <ConfirmDeleteButton
              action={async () => {
                'use server';
                await deleteProject(project.id);
              }}
              message="과제를 영구 삭제하시겠습니까?"
              label="과제 완전 삭제"
              className="btn bg-tertiary hover:bg-tertiary/90 text-white w-full text-[13px] font-bold mt-2"
            />
          </div>
        )}
      </div>
    </div>
  );
}
