CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"state" varchar(30) NOT NULL,
	"initiated_by" uuid NOT NULL,
	"started_at" timestamp with time zone,
	"connected_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"state" varchar(30) NOT NULL,
	"joined_at" timestamp with time zone,
	"left_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"type" varchar(50) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_initiated_by_users_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_events" ADD CONSTRAINT "call_events_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_events" ADD CONSTRAINT "call_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calls_conversation_id_idx" ON "calls" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "calls_initiated_by_idx" ON "calls" USING btree ("initiated_by");--> statement-breakpoint
CREATE INDEX "calls_state_idx" ON "calls" USING btree ("state");--> statement-breakpoint
CREATE INDEX "calls_created_at_idx" ON "calls" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "calls_conversation_created_at_idx" ON "calls" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "call_participants_call_user_unique" ON "call_participants" USING btree ("call_id","user_id");--> statement-breakpoint
CREATE INDEX "call_participants_call_id_idx" ON "call_participants" USING btree ("call_id");--> statement-breakpoint
CREATE INDEX "call_participants_user_id_idx" ON "call_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "call_participants_user_state_idx" ON "call_participants" USING btree ("user_id","state");--> statement-breakpoint
CREATE INDEX "call_events_call_id_idx" ON "call_events" USING btree ("call_id");--> statement-breakpoint
CREATE INDEX "call_events_actor_user_id_idx" ON "call_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "call_events_type_idx" ON "call_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "call_events_created_at_idx" ON "call_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "call_events_call_created_at_idx" ON "call_events" USING btree ("call_id","created_at");