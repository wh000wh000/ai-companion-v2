-- 叙事支付表 — 每一笔支付都是"为角色做的一件事"
CREATE TABLE "narrative_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"character_id" text NOT NULL,
	"type" text NOT NULL,
	"story_title" text NOT NULL,
	"story_description" text,
	"character_quote" text,
	"item_emoji" text,
	"amount_cents" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"narrative_phase" text DEFAULT 'initiated',
	"narrative_updates" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"delivered_at" timestamp
);
--> statement-breakpoint
-- 记忆瞬间表 — 对话中有特殊情感密度的时刻
CREATE TABLE "memory_moments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"character_id" text NOT NULL,
	"conversation_date" timestamp NOT NULL,
	"summary" text NOT NULL,
	"character_note" text,
	"emotional_density" integer DEFAULT 0,
	"is_saved" boolean DEFAULT false,
	"saved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "narrative_payments" ADD CONSTRAINT "narrative_payments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "memory_moments" ADD CONSTRAINT "memory_moments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "narrative_payments_user_id_idx" ON "narrative_payments" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "narrative_payments_user_char_idx" ON "narrative_payments" USING btree ("user_id","character_id");
--> statement-breakpoint
CREATE INDEX "narrative_payments_status_idx" ON "narrative_payments" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "memory_moments_user_char_idx" ON "memory_moments" USING btree ("user_id","character_id");
--> statement-breakpoint
CREATE INDEX "memory_moments_saved_idx" ON "memory_moments" USING btree ("is_saved");
