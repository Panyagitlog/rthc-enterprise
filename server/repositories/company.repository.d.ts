export declare const create: (data: any) => import("@prisma/client").Prisma.Prisma__CompanyClient<{
    id: string;
    status: import("@prisma/client").$Enums.Status;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    code: string;
}, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
export declare const findAll: () => import("@prisma/client").Prisma.PrismaPromise<{
    id: string;
    status: import("@prisma/client").$Enums.Status;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    code: string;
}[]>;
export declare const findById: (id: string) => import("@prisma/client").Prisma.Prisma__CompanyClient<{
    id: string;
    status: import("@prisma/client").$Enums.Status;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    code: string;
} | null, null, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
export declare const update: (id: string, data: any) => import("@prisma/client").Prisma.Prisma__CompanyClient<{
    id: string;
    status: import("@prisma/client").$Enums.Status;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    code: string;
}, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
export declare const remove: (id: string) => import("@prisma/client").Prisma.Prisma__CompanyClient<{
    id: string;
    status: import("@prisma/client").$Enums.Status;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    code: string;
}, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
//# sourceMappingURL=company.repository.d.ts.map