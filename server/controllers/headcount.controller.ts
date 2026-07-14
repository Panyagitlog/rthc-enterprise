import { Request, Response } from "express";
import * as service from "../services/headcount.service";

export const save = async (req: Request, res: Response) => {
  try {
    const { locationId, requirement, filled, updatedBy } = req.body;

    const result = await service.updateHeadCount(
      locationId,
      Number(requirement),
      Number(filled),
      updatedBy
    );

    res.json({
      success: true,
      message: "Head Count Saved Successfully",
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const current = async (_req: Request, res: Response) => {
  try {
    const result = await service.getCurrentHeadCount();

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};