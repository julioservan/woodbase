CREATE TYPE "public"."cut_type" AS ENUM('lumber', 'live_edge', 'cookie', 'torneado', 'chapa');--> statement-breakpoint
CREATE TABLE "wood_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"species" text,
	"species_confidence" real,
	"quantity" real DEFAULT 1 NOT NULL,
	"unit" text DEFAULT 'tablones' NOT NULL,
	"length_in" real,
	"width_in" real,
	"thickness_in" real,
	"cut_type" "cut_type",
	"location" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"photo_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
