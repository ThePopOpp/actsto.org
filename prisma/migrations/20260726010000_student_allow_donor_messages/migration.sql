-- Student opt-in required before donors can message a 16+ student
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "allow_donor_messages" BOOLEAN NOT NULL DEFAULT false;
