const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany();
  console.log(`Found ${projects.length} projects`);

  for (const project of projects) {
    // Delete existing budgets if any
    await prisma.projectBudget.deleteMany({ where: { projectId: project.id } });

    // Ensure realistic total budget on project
    let baseBudget = project.budget || 150000000;
    if (baseBudget < 1000000) baseBudget = baseBudget * 1000; // adjust small test values
    if (baseBudget < 100000000) baseBudget = 150000000;

    await prisma.project.update({
      where: { id: project.id },
      data: { budget: baseBudget * 2 } // 2-year total
    });

    // 1st Year (2026)
    const year1Gov = Math.round(baseBudget * 0.7);
    const year1Cash = Math.round(baseBudget * 0.15);
    const year1Goods = Math.round(baseBudget * 0.15);

    await prisma.projectBudget.createMany({
      data: [
        {
          projectId: project.id,
          year: 2026,
          category: '인건비',
          govFunding: Math.round(year1Gov * 0.5),
          instCash: Math.round(year1Cash * 0.6),
          instGoods: 0,
          otherFunding: 0,
          amount: Math.round(year1Gov * 0.5 + year1Cash * 0.6),
          spentAmount: Math.round((year1Gov * 0.5 + year1Cash * 0.6) * 0.62)
        },
        {
          projectId: project.id,
          year: 2026,
          category: '연구시설·장비비',
          govFunding: Math.round(year1Gov * 0.2),
          instCash: 0,
          instGoods: year1Goods,
          otherFunding: 0,
          amount: Math.round(year1Gov * 0.2 + year1Goods),
          spentAmount: Math.round((year1Gov * 0.2 + year1Goods) * 0.85)
        },
        {
          projectId: project.id,
          year: 2026,
          category: '연구활동비',
          govFunding: Math.round(year1Gov * 0.15),
          instCash: Math.round(year1Cash * 0.4),
          instGoods: 0,
          otherFunding: 0,
          amount: Math.round(year1Gov * 0.15 + year1Cash * 0.4),
          spentAmount: Math.round((year1Gov * 0.15 + year1Cash * 0.4) * 0.45)
        },
        {
          projectId: project.id,
          year: 2026,
          category: '연구수당',
          govFunding: Math.round(year1Gov * 0.05),
          instCash: 0,
          instGoods: 0,
          otherFunding: 0,
          amount: Math.round(year1Gov * 0.05),
          spentAmount: Math.round(year1Gov * 0.05 * 0.5)
        },
        {
          projectId: project.id,
          year: 2026,
          category: '간접비',
          govFunding: Math.round(year1Gov * 0.1),
          instCash: 0,
          instGoods: 0,
          otherFunding: 0,
          amount: Math.round(year1Gov * 0.1),
          spentAmount: Math.round(year1Gov * 0.1 * 0.7)
        }
      ]
    });

    // 2nd Year (2027)
    const year2Base = Math.round(baseBudget * 1.1);
    const year2Gov = Math.round(year2Base * 0.75);
    const year2Cash = Math.round(year2Base * 0.15);
    const year2Goods = Math.round(year2Base * 0.1);

    await prisma.projectBudget.createMany({
      data: [
        {
          projectId: project.id,
          year: 2027,
          category: '인건비',
          govFunding: Math.round(year2Gov * 0.5),
          instCash: Math.round(year2Cash * 0.6),
          instGoods: 0,
          otherFunding: 0,
          amount: Math.round(year2Gov * 0.5 + year2Cash * 0.6),
          spentAmount: 0
        },
        {
          projectId: project.id,
          year: 2027,
          category: '연구시설·장비비',
          govFunding: Math.round(year2Gov * 0.2),
          instCash: 0,
          instGoods: year2Goods,
          otherFunding: 0,
          amount: Math.round(year2Gov * 0.2 + year2Goods),
          spentAmount: 0
        },
        {
          projectId: project.id,
          year: 2027,
          category: '연구활동비',
          govFunding: Math.round(year2Gov * 0.15),
          instCash: Math.round(year2Cash * 0.4),
          instGoods: 0,
          otherFunding: 0,
          amount: Math.round(year2Gov * 0.15 + year2Cash * 0.4),
          spentAmount: 0
        },
        {
          projectId: project.id,
          year: 2027,
          category: '연구수당',
          govFunding: Math.round(year2Gov * 0.05),
          instCash: 0,
          instGoods: 0,
          otherFunding: 0,
          amount: Math.round(year2Gov * 0.05),
          spentAmount: 0
        },
        {
          projectId: project.id,
          year: 2027,
          category: '간접비',
          govFunding: Math.round(year2Gov * 0.1),
          instCash: 0,
          instGoods: 0,
          otherFunding: 0,
          amount: Math.round(year2Gov * 0.1),
          spentAmount: 0
        }
      ]
    });
    console.log(`Created 2026 & 2027 budgets for project: ${project.title}`);
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
