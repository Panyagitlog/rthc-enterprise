import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getLocations = async (req: Request, res: Response) => {
  const locations = await prisma.location.findMany({
    include: {
      company: true,
    },
    orderBy: {
      state: "asc",
    },
  });

  res.json(locations);
};