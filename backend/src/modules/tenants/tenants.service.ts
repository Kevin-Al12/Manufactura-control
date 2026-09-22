import { prisma } from "../../db/prisma";
import { generateApiKey } from "../../utils/apiKey";
import { HttpError } from "../../middleware/errorHandler";

export async function getTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new HttpError(404, "Empresa no encontrada");
  return tenant;
}

// Rota la API key usada para disparar eventos por webhook (X-API-Key).
// La anterior queda invalida de inmediato.
export async function rotateApiKey(tenantId: string) {
  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { apiKey: generateApiKey() },
  });
  return tenant;
}
