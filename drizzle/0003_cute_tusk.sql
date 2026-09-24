CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" uuid NOT NULL,
	"room_code" varchar(32) NOT NULL,
	"status" varchar(20) DEFAULT 'waiting' NOT NULL,
	"invitation_token_hash" varchar(64) NOT NULL,
	"invitation_expires_at" timestamp with time zone NOT NULL,
	"invitation_revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	CONSTRAINT "rooms_room_code_unique" UNIQUE("room_code"),
	CONSTRAINT "rooms_invitation_token_hash_unique" UNIQUE("invitation_token_hash")
);
--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rooms_host_id_idx" ON "rooms" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "rooms_status_idx" ON "rooms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rooms_invitation_expires_at_idx" ON "rooms" USING btree ("invitation_expires_at");