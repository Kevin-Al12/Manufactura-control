-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('RUNNING', 'IDLE', 'DOWN', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'READY', 'INSPECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "machines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT,
    "status" "MachineStatus" NOT NULL DEFAULT 'IDLE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_status_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "machine_id" TEXT NOT NULL,
    "status" "MachineStatus" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machine_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "area" TEXT,
    "machine_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'CREATED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(3),
    "ready_at" TIMESTAMPTZ(3),
    "inspected_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "machines_tenant_id_status_idx" ON "machines"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "machines_tenant_id_name_key" ON "machines"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "machine_status_logs_machine_id_created_at_idx" ON "machine_status_logs"("machine_id", "created_at");

-- CreateIndex
CREATE INDEX "machine_status_logs_tenant_id_created_at_idx" ON "machine_status_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "work_orders_tenant_id_status_idx" ON "work_orders"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_tenant_id_code_key" ON "work_orders"("tenant_id", "code");

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_status_logs" ADD CONSTRAINT "machine_status_logs_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
