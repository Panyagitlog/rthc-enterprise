import prisma from "../prisma/client";

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: {
      email,
    },
    include: {
      company: true,
      location: true,
    },
  });
}