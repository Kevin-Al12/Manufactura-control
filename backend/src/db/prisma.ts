import { PrismaClient } from "@prisma/client";

// Cliente unico compartido por el proceso (patron recomendado por Prisma
// para evitar agotar el pool de conexiones con hot-reload en dev).
export const prisma = new PrismaClient();
