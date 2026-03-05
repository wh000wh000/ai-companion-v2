CREATE TABLE "channel_bindings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"channel" text NOT NULL,
	"external_id" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"character_id" text NOT NULL,
	"content" text NOT NULL,
	"type" text NOT NULL,
	"importance" integer DEFAULT 3 NOT NULL,
	"level" integer DEFAULT 3 NOT NULL,
	"tags" text[],
	"expires_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"coin_balance" integer DEFAULT 0 NOT NULL,
	"pocket_money" integer DEFAULT 0 NOT NULL,
	"is_first_charge" boolean DEFAULT true NOT NULL,
	"subscription_tier" text DEFAULT 'none' NOT NULL,
	"total_charged" integer DEFAULT 0 NOT NULL,
	"total_gifted" integer DEFAULT 0 NOT NULL,
	"costume_tickets" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"coins" integer NOT NULL,
	"pocket_gain" integer DEFAULT 0 NOT NULL,
	"trust_gain" integer DEFAULT 0 NOT NULL,
	"description" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trust_records" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"user_id" text NOT NULL,
	"trust_points" integer DEFAULT 0 NOT NULL,
	"trust_level" integer DEFAULT 1 NOT NULL,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"last_interact_at" timestamp,
	"days_at_current_level" integer DEFAULT 0 NOT NULL,
	"is_shaken" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surprises" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"product_name" text,
	"product_url" text,
	"amount" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pack_id" text NOT NULL,
	"amount" integer NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"transaction_id" text,
	"payment_params" text,
	"description" text,
	"paid_at" timestamp,
	"expire_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_bindings" ADD CONSTRAINT "channel_bindings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_records" ADD CONSTRAINT "trust_records_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_records" ADD CONSTRAINT "trust_records_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surprises" ADD CONSTRAINT "surprises_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surprises" ADD CONSTRAINT "surprises_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "channel_bindings_channel_external_id_idx" ON "channel_bindings" USING btree ("channel","external_id");--> statement-breakpoint
CREATE INDEX "memories_user_char_idx" ON "memories" USING btree ("user_id","character_id");--> statement-breakpoint
CREATE INDEX "memories_type_idx" ON "memories" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_user_id_idx" ON "wallets" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_idempotency_key_idx" ON "transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "trust_records_character_user_idx" ON "trust_records" USING btree ("character_id","user_id");