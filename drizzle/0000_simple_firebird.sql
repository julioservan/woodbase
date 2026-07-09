CREATE TYPE "public"."moisture_state" AS ENUM('verde', 'secando', 'seco');--> statement-breakpoint
CREATE TABLE "wood_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"species" text,
	"species_confidence" real,
	"quantity" real DEFAULT 1 NOT NULL,
	"unit" text DEFAULT 'tablones' NOT NULL,
	"length_mm" integer,
	"width_mm" integer,
	"thickness_mm" integer,
	"moisture_state" "moisture_state",
	"location" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"photo_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
