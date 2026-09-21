import { createProject } from '@/app/actions';
import { authOptions, getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function NewProjectPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (session.user.role === 'RESEARCHER') {
    return (
      <div className="glass-panel p-12 text-center max-w-2xl mx-auto mt-12">
        <h2 className="text-[28px] font-bold text-primary">접근 권한 없음</h2>
        <p className="text-[14px] text-gray-500 mt-2">관리자(Admin) 및 과제 책임자(PM)만 새로운 과제를 등록할 수 있습니다.</p>
        <Link href="/" className="btn btn-primary mt-6 inline-flex">
          대시보드로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <h1 className="text-[32px] font-bold text-primary">신규 연구개발과제 등록</h1>
        <Link href="/projects" className="text-[14px] font-bold text-gray-500 hover:text-primary">
          취소 및 뒤로가기
        </Link>
      </div>
      
      <form action={createProject} className="glass-panel overflow-hidden p-0">
        
        {/* Section 1: Basic Info */}
        <div className="p-8 border-b border-border">
          <h3 className="text-[20px] font-bold text-primary mb-6 flex items-center">
            <span className="bg-primary text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-[12px] mr-2">1</span>
            과제 기본 정보
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="input-group">
              <label htmlFor="title">국문 연구개발과제명 <span className="text-[#ff2357]">*</span></label>
              <input type="text" id="title" name="title" required placeholder="예: 위변조 방지 보안영상 전주기 무결성 검증..." />
            </div>
            <div className="input-group">
              <label htmlFor="titleEn">영문 연구개발과제명</label>
              <input type="text" id="titleEn" name="titleEn" placeholder="e.g. Development of Image Integrity..." />
            </div>
          </div>

          <div className="mb-6 input-group">
            <label htmlFor="description">과제 상세 설명</label>
            <textarea id="description" name="description" rows={3} placeholder="과제의 목표와 범위를 간략히 설명해주세요..."></textarea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div className="input-group">
              <label htmlFor="status">초기 상태</label>
              <select id="status" name="status">
                <option value="PLANNING">계획 중</option>
                <option value="IN_PROGRESS">진행 중</option>
                <option value="ON_HOLD">보류 중</option>
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="securityClass">보안등급</label>
              <select id="securityClass" name="securityClass">
                <option value="일반">일반</option>
                <option value="보안">보안</option>
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="selectionMethod">선정방식</label>
              <select id="selectionMethod" name="selectionMethod">
                <option value="정책지정">정책지정</option>
                <option value="지정공모">공모: 지정공모</option>
                <option value="품목공모">공모: 품목공모</option>
                <option value="분야공모">공모: 분야공모</option>
                <option value="자유공모">공모: 자유공모</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 bg-surface-lowest p-6 rounded-lg border border-border">
            <div className="input-group">
              <label htmlFor="centralAgency">중앙행정기관명</label>
              <input type="text" id="centralAgency" name="centralAgency" placeholder="예: 과학기술정보통신부" />
            </div>
            <div className="input-group">
              <label htmlFor="specializedAgency">전문기관명</label>
              <input type="text" id="specializedAgency" name="specializedAgency" placeholder="예: 정보통신기획평가원" />
            </div>
            <div className="input-group">
              <label htmlFor="programName">사업명</label>
              <input type="text" id="programName" name="programName" placeholder="예: 정보보호핵심원천기술개발" />
            </div>
            <div className="input-group">
              <label htmlFor="subProgramName">내역사업명</label>
              <input type="text" id="subProgramName" name="subProgramName" placeholder="예: 취약점대응 및 신산업융합보호" />
            </div>
            <div className="input-group">
              <label htmlFor="noticeNumber">공고번호</label>
              <input type="text" id="noticeNumber" name="noticeNumber" placeholder="예: 제2024-0011호" />
            </div>
            <div className="input-group">
              <label htmlFor="projectNumber">연구개발과제번호</label>
              <input type="text" id="projectNumber" name="projectNumber" placeholder="예: RS-2024-00400368" />
            </div>
          </div>
        </div>

        {/* Section 2: 기관 및 인력 정보 */}
        <div className="p-8 border-b border-border">
          <h3 className="text-[20px] font-bold text-primary mb-6 flex items-center">
            <span className="bg-primary text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-[12px] mr-2">2</span>
            주관기관 및 연구책임자 정보
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="input-group">
              <label htmlFor="leadAgency">주관연구개발기관 기관명</label>
              <input type="text" id="leadAgency" name="leadAgency" placeholder="예: (주)노웨어소프트" />
            </div>
            <div className="input-group">
              <label htmlFor="leadAgencyBizNo">사업자등록번호</label>
              <input type="text" id="leadAgencyBizNo" name="leadAgencyBizNo" placeholder="예: 504-82-10122" />
            </div>
            <div className="md:col-span-2 input-group">
              <label htmlFor="leadAgencyAddress">기관 주소</label>
              <input type="text" id="leadAgencyAddress" name="leadAgencyAddress" placeholder="예: 대구광역시 달성군..." />
            </div>
          </div>

          <div className="bg-surface-lowest rounded-lg p-6 border border-border mb-6">
            <h4 className="text-[14px] font-bold text-primary mb-4 uppercase tracking-wide">연구책임자</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="input-group">
                <label htmlFor="piName">성명</label>
                <input type="text" id="piName" name="piName" />
              </div>
              <div className="input-group">
                <label htmlFor="piTitle">직위</label>
                <input type="text" id="piTitle" name="piTitle" />
              </div>
              <div className="input-group">
                <label htmlFor="piNo">국가연구자번호</label>
                <input type="text" id="piNo" name="piNo" />
              </div>
              <div className="input-group">
                <label htmlFor="piPhone">직장전화</label>
                <input type="text" id="piPhone" name="piPhone" />
              </div>
              <div className="input-group">
                <label htmlFor="piMobile">휴대전화</label>
                <input type="text" id="piMobile" name="piMobile" />
              </div>
              <div className="input-group">
                <label htmlFor="piEmail">전자우편</label>
                <input type="email" id="piEmail" name="piEmail" />
              </div>
            </div>
          </div>

          <div className="bg-surface-lowest rounded-lg p-6 border border-border">
            <h4 className="text-[14px] font-bold text-primary mb-4 uppercase tracking-wide">실무담당자</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="input-group">
                <label htmlFor="managerName">성명</label>
                <input type="text" id="managerName" name="managerName" />
              </div>
              <div className="input-group">
                <label htmlFor="managerTitle">직위</label>
                <input type="text" id="managerTitle" name="managerTitle" />
              </div>
              <div className="input-group">
                <label htmlFor="managerNo">국가연구자번호</label>
                <input type="text" id="managerNo" name="managerNo" />
              </div>
              <div className="input-group">
                <label htmlFor="managerPhone">직장전화</label>
                <input type="text" id="managerPhone" name="managerPhone" />
              </div>
              <div className="input-group">
                <label htmlFor="managerMobile">휴대전화</label>
                <input type="text" id="managerMobile" name="managerMobile" />
              </div>
              <div className="input-group">
                <label htmlFor="managerEmail">전자우편</label>
                <input type="email" id="managerEmail" name="managerEmail" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: 기간 및 기술분류 */}
        <div className="p-8">
          <h3 className="text-[20px] font-bold text-primary mb-6 flex items-center">
            <span className="bg-primary text-white rounded-full w-6 h-6 inline-flex items-center justify-center text-[12px] mr-2">3</span>
            기간 및 기술분류
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="input-group">
              <label htmlFor="startDate">연구개발 시작일 <span className="text-[#ff2357]">*</span></label>
              <input type="date" id="startDate" name="startDate" required />
            </div>
            <div className="input-group">
              <label htmlFor="endDate">연구개발 종료일 <span className="text-[#ff2357]">*</span></label>
              <input type="date" id="endDate" name="endDate" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="input-group">
              <label htmlFor="scienceTechClass">국가과학기술표준분류</label>
              <input type="text" id="scienceTechClass" name="scienceTechClass" placeholder="예: 산업보안/융합보안(EE0304)" />
            </div>
            <div className="input-group">
              <label htmlFor="ictClass">ICT기술분류</label>
              <input type="text" id="ictClass" name="ictClass" placeholder="예: CCTV 감시/관제(SEC0402)" />
            </div>
          </div>
        </div>

        <div className="px-8 py-6 bg-surface-lowest border-t border-border flex justify-end">
          <button type="submit" className="btn btn-primary">
            과제 등록 완료
          </button>
        </div>
      </form>
    </div>
  );
}
