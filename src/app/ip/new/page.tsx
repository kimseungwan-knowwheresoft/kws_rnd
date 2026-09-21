import prisma from '@/lib/prisma';
import { authOptions, getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { createIP } from '@/app/actions';
import Link from 'next/link';

export default async function NewIPPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true }
  });

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <h1 className="text-[32px] font-bold text-primary">신규 지식재산권 등록</h1>
        <Link href="/ip" className="text-[14px] font-bold text-gray-500 hover:text-primary">
          &larr; 목록으로 돌아가기
        </Link>
      </div>

      <div className="glass-panel">
        <form action={createIP} className="p-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-1 input-group">
              <label>구분 (Type)</label>
              <select name="type" required>
                <option value="특허">특허 (Patent)</option>
                <option value="논문">논문 (Paper)</option>
                <option value="기술문서">기술문서 (Tech Doc)</option>
                <option value="GS인증">GS인증 (Certification)</option>
                <option value="기술료">기술료 (Tech Fee)</option>
                <option value="SW등록">SW등록 (Software)</option>
                <option value="기타">기타 (Other)</option>
              </select>
            </div>
            
            <div className="md:col-span-2 input-group">
              <label>명칭 (Title)</label>
              <input type="text" name="title" required placeholder="예: 무결성 데이터 검증 시스템 및 그 방법" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="input-group">
              <label>등록번호 / 출원번호</label>
              <input type="text" name="registrationNo" placeholder="예: 10-2023-0123456" />
            </div>
            <div className="input-group">
              <label>발명자 / 저자</label>
              <input type="text" name="inventor" placeholder="예: 홍길동, 김철수" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 bg-surface-lowest p-6 rounded-lg border border-border">
            <div className="input-group">
              <label>취득일자 / 출원일자</label>
              <input type="date" name="registrationDate" />
            </div>
            <div className="input-group">
              <label>현재 상태</label>
              <select name="status">
                <option value="등록완료">등록완료</option>
                <option value="출원중">출원중</option>
                <option value="심사중">심사중</option>
                <option value="취하/거절">취하/거절</option>
                <option value="유지">유지 (유효)</option>
              </select>
            </div>
          </div>

          {/* 첨부사본 경로 입력 영역 */}
          <div className="mb-6 input-group">
            <label htmlFor="attachmentPath" className="flex items-center gap-1.5 font-bold text-gray-700">
              <i className="fa-solid fa-paperclip text-secondary text-[12px]"></i>
              첨부사본 파일 경로 (증빙문서 보관 위치 / 공유 링크)
            </label>
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <i className="fa-solid fa-folder-open text-[13px]"></i>
              </div>
              <input
                type="text"
                id="attachmentPath"
                name="attachmentPath"
                className="pl-10 text-[13px] font-mono placeholder:font-sans"
                placeholder="예: D:\증빙문서\특허사본\10-2026-0012345_특허등록증.pdf 또는 사내 NAS/클라우드 링크"
              />
            </div>
            <p className="mt-1.5 text-[12px] text-gray-500 flex items-center gap-1.5">
              <i className="fa-solid fa-circle-info text-secondary text-[11px]"></i>
              특허등록증, 출원통지서, GS인증서, 논문 사본 등의 로컬 보관 경로 또는 웹/클라우드 URL을 입력하여 관리할 수 있습니다.
            </p>
          </div>

          <div className="mb-6 input-group">
            <label>연관 연구개발과제 (선택)</label>
            <select name="projectId">
              <option value="">-- 연관 과제 없음 --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <p className="mt-2 text-[12px] text-gray-500">
              과제에서 발생한 성과물인 경우 해당 과제를 매핑해두면 관리가 용이합니다.
            </p>
          </div>

          <div className="mb-8 input-group">
            <label>비고 / 상세 설명</label>
            <textarea name="description" rows={4} placeholder="추가적으로 기재할 내용을 입력하세요."></textarea>
          </div>

          <div className="flex justify-end pt-6 border-t border-border">
            <button type="submit" className="btn btn-primary w-full md:w-auto">
              지식재산권 등록 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
