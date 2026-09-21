'use server';

import prisma from '@/lib/prisma';
import { authOptions, getServerSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';

export async function createProject(formData: FormData) {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'PM')) {
    throw new Error('Unauthorized');
  }

  // Basic Info
  const title = formData.get('title') as string;
  const titleEn = formData.get('titleEn') as string;
  const description = formData.get('description') as string;
  const status = formData.get('status') as string || 'PLANNING';
  
  const startDateStr = formData.get('startDate') as string;
  const endDateStr = formData.get('endDate') as string;
  const startDate = startDateStr ? new Date(startDateStr) : null;
  const endDate = endDateStr ? new Date(endDateStr) : null;

  // Extended Doc Fields
  const securityClass = formData.get('securityClass') as string;
  const centralAgency = formData.get('centralAgency') as string;
  const specializedAgency = formData.get('specializedAgency') as string;
  const programName = formData.get('programName') as string;
  const subProgramName = formData.get('subProgramName') as string;
  const noticeNumber = formData.get('noticeNumber') as string;
  const masterProjectNumber = formData.get('masterProjectNumber') as string;
  const projectNumber = formData.get('projectNumber') as string;
  const selectionMethod = formData.get('selectionMethod') as string;
  const scienceTechClass = formData.get('scienceTechClass') as string;
  const ictClass = formData.get('ictClass') as string;
  const masterTitleKr = formData.get('masterTitleKr') as string;
  const masterTitleEn = formData.get('masterTitleEn') as string;

  // Lead Agency Details
  const leadAgency = formData.get('leadAgency') as string;
  const leadAgencyBizNo = formData.get('leadAgencyBizNo') as string;
  const leadAgencyCorpNo = formData.get('leadAgencyCorpNo') as string;
  const leadAgencyAddress = formData.get('leadAgencyAddress') as string;
  const participatingAgencies = formData.get('participatingAgencies') as string;
  const agencyContact = formData.get('agencyContact') as string;

  // PI Details
  const piName = formData.get('piName') as string;
  const piTitle = formData.get('piTitle') as string;
  const piPhone = formData.get('piPhone') as string;
  const piMobile = formData.get('piMobile') as string;
  const piEmail = formData.get('piEmail') as string;
  const piNo = formData.get('piNo') as string;

  // Manager Details
  const managerName = formData.get('managerName') as string;
  const managerTitle = formData.get('managerTitle') as string;
  const managerPhone = formData.get('managerPhone') as string;
  const managerMobile = formData.get('managerMobile') as string;
  const managerEmail = formData.get('managerEmail') as string;
  const managerNo = formData.get('managerNo') as string;

  const project = await prisma.project.create({
    data: {
      title, titleEn, description, status, startDate, endDate,
      securityClass, centralAgency, specializedAgency, programName, subProgramName,
      noticeNumber, masterProjectNumber, projectNumber, selectionMethod,
      scienceTechClass, ictClass, masterTitleKr, masterTitleEn,
      leadAgency, leadAgencyBizNo, leadAgencyCorpNo, leadAgencyAddress,
      participatingAgencies, agencyContact,
      piName, piTitle, piPhone, piMobile, piEmail, piNo,
      managerName, managerTitle, managerPhone, managerMobile, managerEmail, managerNo,
      assignments: {
        create: {
          userId: session.user.id,
          roleInProject: 'PM'
        }
      }
    }
  });

  revalidatePath('/');
  redirect(`/projects/${project.id}`);
}

export async function assignMember(projectId: string, userId: string, roleInProject: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'PM')) {
    throw new Error('Unauthorized');
  }

  await prisma.projectAssignment.upsert({
    where: {
      userId_projectId: {
        userId,
        projectId
      }
    },
    update: {
      roleInProject
    },
    create: {
      userId,
      projectId,
      roleInProject
    }
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/participation`);
}

export async function deleteProject(projectId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Only Admins can delete projects');
  }

  await prisma.project.delete({
    where: { id: projectId }
  });

  revalidatePath('/');
  redirect('/');
}

export async function upsertMonthlyParticipation(
  userId: string,
  projectId: string,
  yearMonth: string,
  rate: number,
  fundingType: string = '현금'
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'PM' && session.user.role !== 'HR')) {
    throw new Error('Unauthorized');
  }

  // 100% Validation Logic
  const existingParticipations = await prisma.monthlyParticipation.findMany({
    where: {
      userId,
      yearMonth,
      NOT: { projectId } // Exclude the current project we are updating
    }
  });

  const sumOfOtherRates = existingParticipations.reduce((acc, curr) => acc + curr.rate, 0);
  
  if (sumOfOtherRates + rate > 100) {
    throw new Error(`Total participation rate cannot exceed 100%. Current sum for other projects in ${yearMonth} is ${sumOfOtherRates}%.`);
  }

  await prisma.monthlyParticipation.upsert({
    where: {
      userId_projectId_yearMonth: {
        userId,
        projectId,
        yearMonth
      }
    },
    update: { rate, fundingType },
    create: {
      userId,
      projectId,
      yearMonth,
      rate,
      fundingType
    }
  });

  revalidatePath('/hr');
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/participation`);
  revalidatePath('/settlement/labor-costs');
}

export async function updateAssignmentFundingType(
  projectId: string,
  userId: string,
  fundingType: string,
  year?: number
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'PM' && session.user.role !== 'HR')) {
    throw new Error('Unauthorized');
  }

  await prisma.projectAssignment.updateMany({
    where: { projectId, userId },
    data: { fundingType }
  });

  if (year) {
    const yearPrefix = `${year}-`;
    const monthlyList = await prisma.monthlyParticipation.findMany({
      where: {
        projectId,
        userId,
        yearMonth: { startsWith: yearPrefix }
      }
    });

    for (const mp of monthlyList) {
      await prisma.monthlyParticipation.update({
        where: { id: mp.id },
        data: { fundingType }
      });
    }
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/participation`);
  revalidatePath('/settlement/labor-costs');
}

export async function batchSaveMonthlyParticipations(
  projectId: string,
  userId: string,
  year: number,
  months: { month: number; rate: number; fundingType: string }[]
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'PM' && session.user.role !== 'HR')) {
    throw new Error('Unauthorized');
  }

  for (const item of months) {
    const mStr = item.month < 10 ? `0${item.month}` : `${item.month}`;
    const yearMonth = `${year}-${mStr}`;

    await prisma.monthlyParticipation.upsert({
      where: {
        userId_projectId_yearMonth: {
          userId,
          projectId,
          yearMonth
        }
      },
      update: {
        rate: item.rate,
        fundingType: item.fundingType
      },
      create: {
        userId,
        projectId,
        yearMonth,
        rate: item.rate,
        fundingType: item.fundingType
      }
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/participation`);
  revalidatePath('/settlement/labor-costs');
}

export async function removeProjectAssignment(projectId: string, userId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'PM' && session.user.role !== 'HR')) {
    throw new Error('Unauthorized');
  }

  // Also remove any monthly participations for this user/project
  await prisma.monthlyParticipation.deleteMany({
    where: { projectId, userId }
  });

  await prisma.projectAssignment.delete({
    where: {
      userId_projectId: { userId, projectId }
    }
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/participation`);
}

export async function updateAssignmentInfo(
  assignmentId: string,
  projectId: string,
  formData: FormData
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'PM' && session.user.role !== 'HR')) {
    throw new Error('Unauthorized');
  }

  const researchRole = formData.get('researchRole') as string || null;
  const participationPeriod = formData.get('participationPeriod') as string || null;
  const newHireType = formData.get('newHireType') as string || null;
  const flexibleWork = formData.get('flexibleWork') as string || null;
  const thisProjectRateStr = formData.get('thisProjectRate') as string;
  const nationalRndRateStr = formData.get('nationalRndRate') as string;
  const totalRndProjectsStr = formData.get('totalRndProjects') as string;
  const fundingType = formData.get('fundingType') as string || undefined;
  const roleInProject = formData.get('roleInProject') as string || undefined;

  await prisma.projectAssignment.update({
    where: { id: assignmentId },
    data: {
      roleInProject: roleInProject || undefined,
      researchRole: researchRole || undefined,
      participationPeriod: participationPeriod || undefined,
      newHireType: newHireType || undefined,
      flexibleWork: flexibleWork || undefined,
      thisProjectRate: thisProjectRateStr ? parseFloat(thisProjectRateStr) : undefined,
      nationalRndRate: nationalRndRateStr ? parseFloat(nationalRndRateStr) : undefined,
      totalRndProjects: totalRndProjectsStr ? parseInt(totalRndProjectsStr) : undefined,
      fundingType: fundingType || undefined,
    }
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/participation`);
}

export async function updateProjectAssignmentRole(
  projectId: string,
  userId: string,
  roleInProject: string
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'PM' && session.user.role !== 'HR')) {
    throw new Error('Unauthorized');
  }

  await prisma.projectAssignment.updateMany({
    where: { projectId, userId },
    data: { roleInProject }
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/participation`);
}

export async function createProjectBudget(projectId: string, year: number, category: string, govFunding: number, instCash: number, instGoods: number, otherFunding: number) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'PM' && session.user.role !== 'HR')) {
    throw new Error('Unauthorized');
  }

  const amount = govFunding + instCash + instGoods + otherFunding;

  await prisma.projectBudget.create({
    data: {
      projectId,
      year,
      category,
      govFunding,
      instCash,
      instGoods,
      otherFunding,
      amount
    }
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/annual-budget`);
  revalidatePath('/settlement/projects');
}

export async function updateAnnualStandardBudgets(
  projectId: string,
  annualData: Array<{
    year: number;
    govFunding: number;
    instCash: number;
    instGoods: number;
    localCash?: number;
    localGoods?: number;
    otherCash?: number;
    otherGoods?: number;
  }>
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'PM' && session.user.role !== 'HR')) {
    throw new Error('Unauthorized');
  }

  for (const item of annualData) {
    const totalOther = (item.localCash || 0) + (item.localGoods || 0) + (item.otherCash || 0) + (item.otherGoods || 0);
    const totalYearAmount = item.govFunding + item.instCash + item.instGoods + totalOther;

    const existing = await prisma.projectBudget.findMany({
      where: { projectId, year: item.year }
    });

    if (existing.length === 0) {
      await prisma.projectBudget.create({
        data: {
          projectId,
          year: item.year,
          category: '연구개발비 총괄',
          govFunding: item.govFunding,
          instCash: item.instCash,
          instGoods: item.instGoods,
          otherFunding: totalOther,
          amount: totalYearAmount,
          spentAmount: 0
        }
      });
    } else {
      // Update the first/main row
      const mainRow = existing[0];
      await prisma.projectBudget.update({
        where: { id: mainRow.id },
        data: {
          govFunding: item.govFunding,
          instCash: item.instCash,
          instGoods: item.instGoods,
          otherFunding: totalOther,
          amount: totalYearAmount
        }
      });
    }
  }

  // Recalculate total project budget
  const allBudgets = await prisma.projectBudget.findMany({ where: { projectId } });
  const totalProjectBudget = allBudgets.reduce((sum, b) => sum + b.amount, 0);
  await prisma.project.update({
    where: { id: projectId },
    data: { budget: totalProjectBudget }
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/annual-budget`);
  revalidatePath('/settlement/projects');
}

export async function deleteProjectBudget(id: string, projectId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'PM' && session.user.role !== 'HR')) {
    throw new Error('Unauthorized');
  }

  await prisma.projectBudget.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/annual-budget`);
  revalidatePath('/settlement/projects');
}

export async function saveCategoryBudgets(
  projectId: string,
  year: number,
  categories: Array<{
    category: string;
    govFunding: number;
    instCash: number;
    instGoods: number;
    otherFunding?: number;
    itemsDetail?: string | null;
  }>
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'PM' && session.user.role !== 'HR')) {
    throw new Error('Unauthorized');
  }

  // Remove existing budget entries for this project and year
  await prisma.projectBudget.deleteMany({
    where: { projectId, year }
  });

  // Create new entries for each category
  for (const item of categories) {
    const totalAmount = (item.govFunding || 0) + (item.instCash || 0) + (item.instGoods || 0) + (item.otherFunding || 0);
    await prisma.projectBudget.create({
      data: {
        projectId,
        year,
        category: item.category,
        govFunding: item.govFunding || 0,
        instCash: item.instCash || 0,
        instGoods: item.instGoods || 0,
        otherFunding: item.otherFunding || 0,
        amount: totalAmount,
        spentAmount: 0,
        itemsDetail: item.itemsDetail || null
      }
    });
  }

  // Recalculate total project budget
  const allBudgets = await prisma.projectBudget.findMany({ where: { projectId } });
  const totalProjectBudget = allBudgets.reduce((sum, b) => sum + b.amount, 0);
  await prisma.project.update({
    where: { id: projectId },
    data: { budget: totalProjectBudget }
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/annual-budget`);
  revalidatePath('/settlement/projects');
}


export async function createProjectEvaluation(projectId: string, type: string, description: string, date: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'PM')) {
    throw new Error('Unauthorized');
  }

  await prisma.projectEvaluation.create({
    data: {
      projectId,
      type,
      description,
      date: date ? new Date(date) : null
    }
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function deleteEvaluation(id: string, projectId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'PM')) {
    throw new Error('Unauthorized');
  }

  await prisma.projectEvaluation.delete({ where: { id } });
  revalidatePath(`/projects/${projectId}`);
}

export async function updateUserHRInfo(userId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'HR' && session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const nationality = formData.get('nationality') as string;
  const affiliation = formData.get('affiliation') as string;
  const birthDateAndGender = formData.get('birthDateAndGender') as string;
  const degree = formData.get('degree') as string;
  const major = formData.get('major') as string;
  const degreeYear = formData.get('degreeYear') as string;
  const researcherNumber = formData.get('researcherNumber') as string;

  await prisma.user.update({
    where: { id: userId },
    data: {
      nationality,
      affiliation,
      birthDateAndGender,
      degree,
      major,
      degreeYear,
      researcherNumber
    }
  });

  revalidatePath('/hr');
}


export async function createIP(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Unauthorized');

  const type = formData.get('type') as string;
  const title = formData.get('title') as string;
  const registrationNo = formData.get('registrationNo') as string;
  const registrationDate = formData.get('registrationDate') as string;
  const inventor = formData.get('inventor') as string;
  const status = formData.get('status') as string;
  const description = formData.get('description') as string;
  const attachmentPath = formData.get('attachmentPath') as string;
  const projectId = formData.get('projectId') as string;

  await prisma.intellectualProperty.create({
    data: {
      type,
      title,
      registrationNo,
      registrationDate: registrationDate ? new Date(registrationDate) : null,
      inventor,
      status,
      description,
      attachmentPath: attachmentPath || null,
      projectId: projectId || null
    }
  });

  revalidatePath('/ip');
  redirect('/ip');
}

export async function deleteIP(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  await prisma.intellectualProperty.delete({ where: { id } });
  revalidatePath('/ip');
}

export async function updateBudgetExecution(budgetId: string, projectId: string, spentAmount: number) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'PM' && session.user.role !== 'HR')) {
    throw new Error('Unauthorized');
  }

  await prisma.projectBudget.update({
    where: { id: budgetId },
    data: { spentAmount }
  });

  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath(`/projects/${projectId}`);
}

export async function createUser(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
    throw new Error('Unauthorized: Only Admin and HR can create users');
  }

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = (formData.get('password') as string) || 'password123';
  const role = (formData.get('role') as string) || 'RESEARCHER';
  
  const joinDateStr = formData.get('joinDate') as string;
  const joinDate = joinDateStr ? new Date(joinDateStr) : null;
  
  const grossSalaryStr = formData.get('grossSalary') as string;
  const grossSalary = grossSalaryStr ? parseFloat(grossSalaryStr) : null;
  
  const fourInsurancesStr = formData.get('fourInsurances') as string;
  const fourInsurances = fourInsurancesStr ? parseFloat(fourInsurancesStr) : null;

  const nationality = formData.get('nationality') as string;
  const affiliation = formData.get('affiliation') as string;
  const birthDateAndGender = formData.get('birthDateAndGender') as string;
  const degree = formData.get('degree') as string;
  const major = formData.get('major') as string;
  const degreeYear = formData.get('degreeYear') as string;
  const researcherNumber = formData.get('researcherNumber') as string;

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      role,
      joinDate,
      grossSalary,
      fourInsurances,
      nationality,
      affiliation,
      birthDateAndGender,
      degree,
      major,
      degreeYear,
      researcherNumber,
    }
  });

  revalidatePath('/hr');
  redirect('/hr');
}

export async function updateUser(userId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
    throw new Error('Unauthorized');
  }

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const role = formData.get('role') as string;
  const password = formData.get('password') as string;

  const joinDateStr = formData.get('joinDate') as string;
  const joinDate = joinDateStr ? new Date(joinDateStr) : null;
  
  const grossSalaryStr = formData.get('grossSalary') as string;
  const grossSalary = grossSalaryStr ? parseFloat(grossSalaryStr) : null;
  
  const fourInsurancesStr = formData.get('fourInsurances') as string;
  const fourInsurances = fourInsurancesStr ? parseFloat(fourInsurancesStr) : null;

  const nationality = formData.get('nationality') as string;
  const affiliation = formData.get('affiliation') as string;
  const birthDateAndGender = formData.get('birthDateAndGender') as string;
  const degree = formData.get('degree') as string;
  const major = formData.get('major') as string;
  const degreeYear = formData.get('degreeYear') as string;
  const researcherNumber = formData.get('researcherNumber') as string;

  const dataToUpdate: any = {
    name,
    email,
    role,
    joinDate,
    grossSalary,
    fourInsurances,
    nationality,
    affiliation,
    birthDateAndGender,
    degree,
    major,
    degreeYear,
    researcherNumber,
  };

  if (password && password.trim().length > 0) {
    dataToUpdate.password = await bcrypt.hash(password, 10);
  }

  await prisma.user.update({
    where: { id: userId },
    data: dataToUpdate
  });

  revalidatePath('/hr');
  revalidatePath(`/hr/${userId}/edit`);
  redirect('/hr');
}

export async function deleteUser(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
    throw new Error('Unauthorized');
  }

  if (session.user.id === userId) {
    throw new Error('Cannot delete your own account');
  }

  await prisma.user.delete({
    where: { id: userId }
  });

  revalidatePath('/hr');
  redirect('/hr');
}

