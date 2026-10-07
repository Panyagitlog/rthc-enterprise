import { Request, Response } from "express";
export declare function getCompanies(_req: Request, res: Response): Promise<void>;
export declare function getCompany(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createCompany(req: Request, res: Response): Promise<void>;
export declare function updateCompany(req: Request, res: Response): Promise<void>;
export declare function deleteCompany(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=company.controller.d.ts.map