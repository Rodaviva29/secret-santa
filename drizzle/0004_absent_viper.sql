ALTER TABLE "draw" ADD COLUMN "deliver_reveal" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "draw" ADD COLUMN "deliver_whatsapp" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "draw" ADD COLUMN "deliver_email" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "draw" ADD COLUMN "deliver_push" boolean DEFAULT false NOT NULL;