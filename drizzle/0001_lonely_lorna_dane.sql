CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"addressee_id" uuid NOT NULL,
	"user_low_id" uuid NOT NULL,
	"user_high_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_not_self_check" CHECK ("contacts"."requester_id" <> "contacts"."addressee_id"),
	CONSTRAINT "contacts_canonical_pair_check" CHECK ("contacts"."user_low_id" < "contacts"."user_high_id")
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_addressee_id_users_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_low_id_users_id_fk" FOREIGN KEY ("user_low_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_high_id_users_id_fk" FOREIGN KEY ("user_high_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contacts_requester_id_idx" ON "contacts" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "contacts_addressee_id_idx" ON "contacts" USING btree ("addressee_id");--> statement-breakpoint
CREATE INDEX "contacts_user_low_id_idx" ON "contacts" USING btree ("user_low_id");--> statement-breakpoint
CREATE INDEX "contacts_user_high_id_idx" ON "contacts" USING btree ("user_high_id");--> statement-breakpoint
CREATE INDEX "contacts_status_idx" ON "contacts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_user_pair_unique_idx" ON "contacts" USING btree ("user_low_id","user_high_id");