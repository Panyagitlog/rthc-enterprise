import prisma from "../prisma/client";

export const create = (data: any) => {
  return prisma.company.create({
    data,
  });
};

export const findAll = () => {
  return prisma.company.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const findById = (id: string) => {
  return prisma.company.findUnique({
    where: {
      id,
    },
  });
};

export const update = (id: string, data: any) => {
  return prisma.company.update({
    where: {
      id,
    },
    data,
  });
};

export const remove = (id: string) => {
  return prisma.company.delete({
    where: {
      id,
    },
  });
};