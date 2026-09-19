export declare const createCompany: (data: any) => Promise<{
    id: string;
    status: import("@prisma/client").$Enums.Status;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    code: string;
}>;
export declare const getCompanies: () => Promise<{
    id: string;
    status: import("@prisma/client").$Enums.Status;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    code: string;
}[]>;
export declare const getCompany: (id: string) => Promise<{
    id: string;
    status: import("@prisma/client").$Enums.Status;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    code: string;
} | null>;
export declare const updateCompany: (id: string, data: any) => Promise<{
    id: string;
    status: import("@prisma/client").$Enums.Status;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    code: string;
}>;
export declare const deleteCompany: (id: string) => Promise<{
    id: string;
    status: import("@prisma/client").$Enums.Status;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    code: string;
}>;
//# sourceMappingURL=company.service.d.ts.map