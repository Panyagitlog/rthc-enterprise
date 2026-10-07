import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function updateHeadCount(
  locationId: string,
  requirement: number,
  filled: number,
  updatedBy: string
) {
  const variation = requirement - filled;

  const current = await prisma.headCountCurrent.upsert({
    where: {
      locationId,
    },
    update: {
      requirement,
      filled,
      variation,
      updatedById: updatedBy,
    },
    create: {
      locationId,
      requirement,
      filled,
      variation,
      updatedById: updatedBy,
    },
  });

  await prisma.headCountHistory.create({
    data: {
      locationId,
      requirement,
      filled,
      variation,
      updatedBy,
    },
  });

  return current;
}

export async function getCurrentHeadCount() {
  return prisma.headCountCurrent.findMany({
    include: {
      location: {
        include: {
          company: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}