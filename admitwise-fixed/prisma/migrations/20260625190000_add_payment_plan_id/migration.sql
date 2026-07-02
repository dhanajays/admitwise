ALTER TABLE "Payment" ADD COLUMN "planId" TEXT;

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "Plan"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Payment_planId_idx" ON "Payment"("planId");
