CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid,
	"guest_token_hash" varchar(64) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	CONSTRAINT "participants_guest_token_hash_unique" UNIQUE("guest_token_hash")
);
--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "participants_room_id_idx" ON "participants" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "participants_user_id_idx" ON "participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "participants_guest_token_hash_idx" ON "participants" USING btree ("guest_token_hash");