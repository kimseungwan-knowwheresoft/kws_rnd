'use client';

import { useState } from 'react';
import Link from 'next/link';

interface UserData {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  joinDate?: string | null;
  grossSalary?: number | null;
  fourInsurances?: number | null;
  nationality?: string | null;
  affiliation?: string | null;
  birthDateAndGender?: string | null;
  degree?: string | null;
  major?: string | null;
  degreeYear?: string | null;
  researcherNumber?: string | null;
}

interface Props {
  initialData?: UserData;
  formAction: (formData: FormData) => Promise<void>;
  isEdit?: boolean;
}

export default function HRUserForm({ initialData, formAction, isEdit = false }: Props) {
  const [grossSalary, setGrossSalary] = useState<number>(initialData?.grossSalary || 0);
  const [fourInsurances, setFourInsurances] = useState<number>(initialData?.fourInsurances || 0);

  const totalCompensation = (grossSalary || 0) + (fourInsurances || 0);

  // Format date to YYYY-MM-DD for input
  const defaultJoinDate = initialData?.joinDate
    ? new Date(initialData.joinDate).toISOString().split('T')[0]
    : '';

  return (
    <form action={formAction} className="space-y-8">
      {/* 1. Account & Basic Role */}
      <div className="glass-panel p-6 sm:p-8">
        <h2 className="text-[18px] font-bold text-primary border-b border-border pb-3 mb-6 flex items-center gap-2">
          <i className="fa-solid fa-id-card text-secondary"></i>
          기본 계정 및 직무 정보
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="input-group">
            <label htmlFor="name">성명 <span className="text-[#ff2357]">*</span></label>
            <input
              type="text"
              id="name"
              name="name"
              required
              defaultValue={initialData?.name || ''}
              placeholder="예: 홍길동"
            />
          </div>

          <div className="input-group">
            <label htmlFor="email">이메일 계정 <span className="text-[#ff2357]">*</span></label>
            <input
              type="email"
              id="email"
              name="email"
              required
              defaultValue={initialData?.email || ''}
              placeholder="hong@company.com"
            />
          </div>

          <div className="input-group">
            <label htmlFor="role">시스템 역할 <span className="text-[#ff2357]">*</span></label>
            <select id="role" name="role" defaultValue={initialData?.role || 'RESEARCHER'}>
              <option value="RESEARCHER">연구원 (RESEARCHER)</option>
              <option value="PM">과제 책임자 (PM)</option>
              <option value="HR">인력 관리자 (HR)</option>
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="password">
              비밀번호 {isEdit ? '(변경 시에만 입력)' : '*'}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder={isEdit ? '미입력 시 기존 비밀번호 유지' : '초기 비밀번호'}
              defaultValue={isEdit ? '' : 'password123'}
              required={!isEdit}
            />
          </div>
        </div>
      </div>

      {/* 2. HR & Salary / Compensation Info */}
      <div className="glass-panel p-6 sm:p-8">
        <div className="flex justify-between items-center border-b border-border pb-3 mb-6">
          <h2 className="text-[18px] font-bold text-primary flex items-center gap-2">
            <i className="fa-solid fa-coins text-secondary"></i>
            입사일 및 급여 / 인건비 정보
          </h2>
          <div className="text-[12px] bg-secondary/10 text-secondary font-bold px-3 py-1 rounded-full">
            4대보험 포함 연봉 실시간 계산
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div className="input-group">
            <label htmlFor="joinDate">입사일 (Hire Date) <span className="text-[#ff2357]">*</span></label>
            <input
              type="date"
              id="joinDate"
              name="joinDate"
              required
              defaultValue={defaultJoinDate}
            />
          </div>

          <div className="input-group">
            <label htmlFor="grossSalary">연봉 (세전, 원) <span className="text-[#ff2357]">*</span></label>
            <input
              type="number"
              id="grossSalary"
              name="grossSalary"
              required
              step="10000"
              value={grossSalary || ''}
              onChange={(e) => setGrossSalary(parseFloat(e.target.value) || 0)}
              placeholder="예: 60000000"
            />
          </div>

          <div className="input-group">
            <label htmlFor="fourInsurances">4대보험 회사부담금 (원) <span className="text-[#ff2357]">*</span></label>
            <input
              type="number"
              id="fourInsurances"
              name="fourInsurances"
              required
              step="10000"
              value={fourInsurances || ''}
              onChange={(e) => setFourInsurances(parseFloat(e.target.value) || 0)}
              placeholder="예: 5400000"
            />
          </div>
        </div>

        {/* Real-time Compensation Calculation Banner */}
        <div className="bg-surface-lowest border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[12px] text-gray-500 font-semibold uppercase tracking-wide">
              4대보험 포함 총 연봉 (총 소요 인건비)
            </div>
            <div className="text-[13px] text-gray-400 mt-0.5">
              = 연봉(세전) {grossSalary.toLocaleString()}원 + 4대보험 부담금 {fourInsurances.toLocaleString()}원
            </div>
          </div>
          <div className="text-[26px] font-black font-mono text-secondary">
            {totalCompensation.toLocaleString()} <span className="text-[15px] font-medium text-gray-700">원 / 년</span>
          </div>
        </div>
      </div>

      {/* 3. Researcher Personal & Academic Background */}
      <div className="glass-panel p-6 sm:p-8">
        <h2 className="text-[18px] font-bold text-primary border-b border-border pb-3 mb-6 flex items-center gap-2">
          <i className="fa-solid fa-graduation-cap text-secondary"></i>
          인적 및 학위/연구자 정보
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
          <div className="input-group">
            <label htmlFor="nationality">국적</label>
            <input
              type="text"
              id="nationality"
              name="nationality"
              defaultValue={initialData?.nationality || '대한민국'}
              placeholder="예: 대한민국"
            />
          </div>

          <div className="input-group">
            <label htmlFor="employmentType">인력 구분 (고용 형태) <span className="text-[#ff2357]">*</span></label>
            <select
              id="employmentType"
              defaultValue={
                initialData?.affiliation === '프리랜서' || initialData?.affiliation?.includes('프리랜서')
                  ? '프리랜서'
                  : '당사 직원'
              }
              onChange={(e) => {
                const affInput = document.getElementById('affiliation') as HTMLInputElement;
                if (affInput) {
                  affInput.value = e.target.value === '프리랜서' ? '프리랜서' : '(주)노웨어소프트';
                }
              }}
              className="text-[13px]"
            >
              <option value="당사 직원">당사 직원 ((주)노웨어소프트)</option>
              <option value="프리랜서">프리랜서 (Freelancer)</option>
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="affiliation">소속기관 / 계약형태 <span className="text-[#ff2357]">*</span></label>
            <input
              type="text"
              id="affiliation"
              name="affiliation"
              required
              defaultValue={initialData?.affiliation || '(주)노웨어소프트'}
              placeholder="예: (주)노웨어소프트 또는 프리랜서"
            />
          </div>

          <div className="input-group">
            <label htmlFor="birthDateAndGender">생년월일(성별)</label>
            <input
              type="text"
              id="birthDateAndGender"
              name="birthDateAndGender"
              defaultValue={initialData?.birthDateAndGender || ''}
              placeholder="예: 880512(남)"
            />
          </div>

          <div className="input-group">
            <label htmlFor="degree">최종학위</label>
            <select id="degree" name="degree" defaultValue={initialData?.degree || '학사'}>
              <option value="학사">학사</option>
              <option value="석사">석사</option>
              <option value="박사">박사</option>
              <option value="기타">기타</option>
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="major">전공</label>
            <input
              type="text"
              id="major"
              name="major"
              defaultValue={initialData?.major || ''}
              placeholder="예: 컴퓨터공학"
            />
          </div>

          <div className="input-group">
            <label htmlFor="degreeYear">학위 취득년도 (YYYY)</label>
            <input
              type="text"
              id="degreeYear"
              name="degreeYear"
              defaultValue={initialData?.degreeYear || ''}
              placeholder="예: 2018"
            />
          </div>

          <div className="input-group sm:col-span-2 md:col-span-3">
            <label htmlFor="researcherNumber">과학기술인 등록번호 (8자리) <span className="text-[#ff2357]">*</span></label>
            <input
              type="text"
              id="researcherNumber"
              name="researcherNumber"
              defaultValue={initialData?.researcherNumber || ''}
              placeholder="예: 12345678"
              required
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between pt-4">
        <Link href="/hr" className="btn btn-secondary px-6">
          <i className="fa-solid fa-arrow-left mr-2"></i>
          인력 리스트로 돌아가기
        </Link>
        <button type="submit" className="btn btn-primary px-8">
          <i className={`fa-solid ${isEdit ? 'fa-check' : 'fa-plus'} mr-2`}></i>
          {isEdit ? '직원 정보 수정 완료' : '신규 인력 등록하기'}
        </button>
      </div>
    </form>
  );
}
