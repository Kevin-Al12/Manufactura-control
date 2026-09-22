import { Router } from "express";
import { Role } from "@prisma/client";
import * as tenantsService from "./tenants.service";
import { authenticate, authorize } from "../../middleware/auth";

export const tenantsRouter = Router();
tenantsRouter.use(authenticate);

tenantsRouter.get("/", authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const tenant = await tenantsService.getTenant(req.auth!.tenantId);
    res.json({ tenant });
  } catch (err) {
    next(err);
  }
});

tenantsRouter.post("/api-key/rotate", authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const tenant = await tenantsService.rotateApiKey(req.auth!.tenantId);
    res.json({ tenant });
  } catch (err) {
    next(err);
  }
});
