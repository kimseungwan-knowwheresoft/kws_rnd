const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Create Users with HR Data
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {
      joinDate: new Date('2020-01-01'),
      grossSalary: 120000000,
      fourInsurances: 10800000,
      name: '시스템 관리자',
      nationality: '대한민국',
      affiliation: '(주)노웨어소프트',
      degree: '석사',
      major: '컴퓨터공학',
    },
    create: {
      email: 'admin@company.com',
      name: '시스템 관리자',
      password: passwordHash,
      role: 'ADMIN',
      joinDate: new Date('2020-01-01'),
      grossSalary: 120000000,
      fourInsurances: 10800000,
      nationality: '대한민국',
      affiliation: '(주)노웨어소프트',
      degree: '석사',
      major: '컴퓨터공학',
    },
  });

  const hr = await prisma.user.upsert({
    where: { email: 'hr@company.com' },
    update: {
      joinDate: new Date('2021-03-01'),
      grossSalary: 80000000,
      fourInsurances: 7200000,
      name: '인사 관리자',
      nationality: '대한민국',
      affiliation: '(주)노웨어소프트',
      degree: '학사',
      major: '경영학',
    },
    create: {
      email: 'hr@company.com',
      name: '인사 관리자',
      password: passwordHash,
      role: 'HR',
      joinDate: new Date('2021-03-01'),
      grossSalary: 80000000,
      fourInsurances: 7200000,
      nationality: '대한민국',
      affiliation: '(주)노웨어소프트',
      degree: '학사',
      major: '경영학',
    },
  });

  const pm = await prisma.user.upsert({
    where: { email: 'pm@company.com' },
    update: {
      joinDate: new Date('2022-05-15'),
      grossSalary: 95000000,
      fourInsurances: 8550000,
      name: '김프로 (PM)',
      nationality: '대한민국',
      affiliation: '(주)노웨어소프트',
      degree: '박사',
      major: '인공지능',
    },
    create: {
      email: 'pm@company.com',
      name: '김프로 (PM)',
      password: passwordHash,
      role: 'PM',
      joinDate: new Date('2022-05-15'),
      grossSalary: 95000000,
      fourInsurances: 8550000,
      nationality: '대한민국',
      affiliation: '(주)노웨어소프트',
      degree: '박사',
      major: '인공지능',
    },
  });

  const researcher1 = await prisma.user.upsert({
    where: { email: 'researcher1@company.com' },
    update: {
      joinDate: new Date('2023-01-10'),
      grossSalary: 60000000,
      fourInsurances: 5400000,
      name: '이연구 (선임)',
      nationality: '대한민국',
      affiliation: '(주)노웨어소프트',
      degree: '석사',
      major: '전자공학',
    },
    create: {
      email: 'researcher1@company.com',
      name: '이연구 (선임)',
      password: passwordHash,
      role: 'RESEARCHER',
      joinDate: new Date('2023-01-10'),
      grossSalary: 60000000,
      fourInsurances: 5400000,
      nationality: '대한민국',
      affiliation: '(주)노웨어소프트',
      degree: '석사',
      major: '전자공학',
    },
  });

  const researcher2 = await prisma.user.upsert({
    where: { email: 'researcher2@company.com' },
    update: {
      joinDate: new Date('2023-08-01'),
      grossSalary: 55000000,
      fourInsurances: 4950000,
      name: '박연구 (주임)',
      nationality: '대한민국',
      affiliation: '(주)노웨어소프트',
      degree: '학사',
      major: '소프트웨어공학',
    },
    create: {
      email: 'researcher2@company.com',
      name: '박연구 (주임)',
      password: passwordHash,
      role: 'RESEARCHER',
      joinDate: new Date('2023-08-01'),
      grossSalary: 55000000,
      fourInsurances: 4950000,
      nationality: '대한민국',
      affiliation: '(주)노웨어소프트',
      degree: '학사',
      major: '소프트웨어공학',
    },
  });

  // Create Projects
  const project1 = await prisma.project.create({
    data: {
      title: 'AI 기반 스마트 공장 영상 분석 엔진 개발',
      titleEn: 'AI-based Smart Factory Video Analysis Engine',
      description: '산업 안전을 위한 실시간 영상 분석 및 이상 행동 감지 엔진 개발.',
      status: '진행중',
      budget: 150000000,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      leadAgency: '(주)노웨어소프트 AI 연구소',
      participatingAgencies: '한국공학대학교',
      agencyContact: '김박사 (kim@kpu.ac.kr)',
      piName: '김프로',
      programName: '산업기술혁신사업',
      assignments: {
        create: [
          { userId: pm.id, roleInProject: 'PM', thisProjectRate: 50, nationalRndRate: 20 },
          { userId: researcher1.id, roleInProject: 'MEMBER', thisProjectRate: 100, nationalRndRate: 0 }
        ]
      }
    }
  });

  const project2 = await prisma.project.create({
    data: {
      title: '자율주행용 양자 센서 프로토타입 연구',
      titleEn: 'Quantum Sensor Prototype for Autonomous Vehicles',
      description: '차세대 자율주행 자동차를 위한 초정밀 양자 센싱 기술 연구 및 시제품 제작.',
      status: '계획중',
      budget: 300000000,
      startDate: new Date('2026-06-01'),
      leadAgency: '(주)노웨어소프트 HW 연구팀',
      piName: '이연구',
      programName: '미래성장동력사업',
      assignments: {
        create: [
          { userId: pm.id, roleInProject: 'PM', thisProjectRate: 40, nationalRndRate: 30 },
          { userId: researcher2.id, roleInProject: 'MEMBER', thisProjectRate: 80.5, nationalRndRate: 10 }
        ]
      }
    }
  });

  // Create Monthly Participations for September 2026
  await prisma.monthlyParticipation.createMany({
    data: [
      { userId: researcher1.id, projectId: project1.id, yearMonth: '2026-09', rate: 100.00 },
      { userId: researcher2.id, projectId: project2.id, yearMonth: '2026-09', rate: 80.50 },
      { userId: pm.id, projectId: project1.id, yearMonth: '2026-09', rate: 50.00 },
      { userId: pm.id, projectId: project2.id, yearMonth: '2026-09', rate: 40.00 },
    ]
  });

  console.log('Database seeded with Korean dummy data!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
