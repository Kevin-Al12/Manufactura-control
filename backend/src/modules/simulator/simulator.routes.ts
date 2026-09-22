import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate, authorize } from "../../middleware/auth";
import { startSimulator, stopSimulator, getSimulatorStatus } from "../../simulator/simulator";

export const simulatorRouter = Router();
simulatorRouter.use(authenticate);

simulatorRouter.get("/status", authorize(Role.ADMIN, Role.SUPERVISOR), (req, res) => {
  res.json(getSimulatorStatus(req.auth!.tenantId));
});

simulatorRouter.post("/start", authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const status = await startSimulator(req.auth!.tenantId);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

simulatorRouter.post("/stop", authorize(Role.ADMIN), (req, res) => {
  res.json(stopSimulator(req.auth!.tenantId));
});
