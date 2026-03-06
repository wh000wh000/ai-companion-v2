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
ALTER TABLE "narrative_payments" ADD CONSTRAINT "narrative_payments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_moments" ADD CONSTRAINT "memory_moments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "narrative_payments_user_idx" ON "narrative_payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "narrative_payments_character_idx" ON "narrative_payments" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "memory_moments_user_idx" ON "memory_moments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memory_moments_character_idx" ON "memory_moments" USING btree ("character_id");
