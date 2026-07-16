import { Response } from "express";
import prisma from "../prisma/client";
import { AuthRequest } from "../middleware/auth.middleware";

export const getDashboard = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const [
      companies,
      locations,
      employees,
      activeEmployees,
      inactiveEmployees,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.location.count(),
      prisma.user.count(),
      prisma.user.count({
        where: {
          isActive: true,
        },
      }),
      prisma.user.count({
        where: {
          isActive: false,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        loggedInUser: req.user,
        companies,
        locations,
        employees,
        activeEmployees,
        inactiveEmployees,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
    });
  }
};