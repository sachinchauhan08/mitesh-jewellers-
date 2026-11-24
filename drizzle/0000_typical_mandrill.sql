CREATE TYPE "public"."sale_channel" AS ENUM('pos', 'online');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('paid', 'partial', 'unpaid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."making_charge_type" AS ENUM('per_gram', 'per_piece', 'percent');--> statement-breakpoint
CREATE TYPE "public"."metal_type" AS ENUM('gold', 'silver', 'platinum', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_direction" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('cash', 'upi', 'card', 'bank', 'cheque', 'advance');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'draft', 'archived');--> statement-breakpoint
CREATE TYPE "public"."purchase_type" AS ENUM('raw_gold', 'finished', 'old_gold');--> statement-breakpoint
CREATE TYPE "public"."repair_status" AS ENUM('received', 'in_progress', 'ready', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."settlement_type" AS ENUM('cash', 'exchange', 'bank');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('opening', 'purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'cashier', 'salesman', 'accountant');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"user_name" varchar(120),
	"action" varchar(60) NOT NULL,
	"entity" varchar(40) NOT NULL,
	"entity_id" varchar(40),
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"code" varchar(20) NOT NULL,
	"address" text,
	"city" varchar(80),
	"phone" varchar(20),
	"gstin" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"parent_id" integer,
	"metal_type" "metal_type" DEFAULT 'gold' NOT NULL,
	"description" text,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(24) NOT NULL,
	"name" varchar(160) NOT NULL,
	"mobile" varchar(15) NOT NULL,
	"email" varchar(160),
	"address" text,
	"city" varchar(80),
	"state" varchar(80),
	"pincode" varchar(10),
	"date_of_birth" date,
	"anniversary" date,
	"gender" varchar(16),
	"loyalty_points" integer DEFAULT 0 NOT NULL,
	"advance_paise" bigint DEFAULT 0 NOT NULL,
	"outstanding_paise" bigint DEFAULT 0 NOT NULL,
	"preferences" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_code_unique" UNIQUE("code"),
	CONSTRAINT "customers_mobile_unique" UNIQUE("mobile")
);
--> statement-breakpoint
CREATE TABLE "document_counters" (
	"doc_type" varchar(30) PRIMARY KEY NOT NULL,
	"prefix" varchar(12) NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metal_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"metal" "metal_type" NOT NULL,
	"purity" varchar(10) NOT NULL,
	"rate_per_gram_paise" bigint NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"source" varchar(60) DEFAULT 'manual' NOT NULL,
	"is_authorized" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "old_gold_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_no" varchar(30) NOT NULL,
	"customer_id" integer,
	"branch_id" integer,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"gross_weight_mg" integer DEFAULT 0 NOT NULL,
	"purity_bp" integer DEFAULT 9160 NOT NULL,
	"melting_loss_bp" integer DEFAULT 0 NOT NULL,
	"net_weight_mg" integer DEFAULT 0 NOT NULL,
	"rate_per_gram_paise" bigint DEFAULT 0 NOT NULL,
	"deduction_bp" integer DEFAULT 0 NOT NULL,
	"final_value_paise" bigint DEFAULT 0 NOT NULL,
	"settlement_type" "settlement_type" DEFAULT 'cash' NOT NULL,
	"invoice_id" integer,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "old_gold_purchases_receipt_no_unique" UNIQUE("receipt_no")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer,
	"purchase_id" integer,
	"customer_id" integer,
	"supplier_id" integer,
	"direction" "payment_direction" DEFAULT 'in' NOT NULL,
	"mode" "payment_mode" DEFAULT 'cash' NOT NULL,
	"amount_paise" bigint NOT NULL,
	"reference" varchar(80),
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"sku" varchar(40) NOT NULL,
	"barcode" varchar(60) NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"description" text,
	"category_id" integer NOT NULL,
	"branch_id" integer,
	"metal_type" "metal_type" DEFAULT 'gold' NOT NULL,
	"purity" varchar(10) DEFAULT '22K' NOT NULL,
	"gross_weight_mg" integer DEFAULT 0 NOT NULL,
	"net_weight_mg" integer DEFAULT 0 NOT NULL,
	"stone_weight_mg" integer DEFAULT 0 NOT NULL,
	"diamond_weight_mg" integer DEFAULT 0 NOT NULL,
	"making_charge_type" "making_charge_type" DEFAULT 'per_gram' NOT NULL,
	"making_charge_value" integer DEFAULT 0 NOT NULL,
	"wastage_bp" integer DEFAULT 0 NOT NULL,
	"stone_charges_paise" bigint DEFAULT 0 NOT NULL,
	"huid" varchar(30),
	"purchase_price_paise" bigint DEFAULT 0 NOT NULL,
	"selling_price_paise" bigint DEFAULT 0 NOT NULL,
	"stock_qty" integer DEFAULT 0 NOT NULL,
	"min_stock_qty" integer DEFAULT 1 NOT NULL,
	"status" "product_status" DEFAULT 'active' NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku"),
	CONSTRAINT "products_barcode_unique" UNIQUE("barcode"),
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_id" integer NOT NULL,
	"product_id" integer,
	"description" varchar(200) NOT NULL,
	"metal_type" "metal_type" DEFAULT 'gold' NOT NULL,
	"purity" varchar(10) DEFAULT '22K' NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"weight_mg" integer DEFAULT 0 NOT NULL,
	"rate_per_gram_paise" bigint DEFAULT 0 NOT NULL,
	"amount_paise" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_no" varchar(30) NOT NULL,
	"supplier_id" integer,
	"branch_id" integer,
	"type" "purchase_type" DEFAULT 'finished' NOT NULL,
	"purchase_date" timestamp with time zone DEFAULT now() NOT NULL,
	"subtotal_paise" bigint DEFAULT 0 NOT NULL,
	"gst_paise" bigint DEFAULT 0 NOT NULL,
	"total_paise" bigint DEFAULT 0 NOT NULL,
	"paid_paise" bigint DEFAULT 0 NOT NULL,
	"due_paise" bigint DEFAULT 0 NOT NULL,
	"status" "invoice_status" DEFAULT 'paid' NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_purchase_no_unique" UNIQUE("purchase_no")
);
--> statement-breakpoint
CREATE TABLE "repairs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_no" varchar(30) NOT NULL,
	"customer_id" integer,
	"branch_id" integer,
	"item_description" varchar(200) NOT NULL,
	"metal_type" "metal_type" DEFAULT 'gold' NOT NULL,
	"gross_weight_mg" integer DEFAULT 0 NOT NULL,
	"issue" text,
	"estimated_cost_paise" bigint DEFAULT 0 NOT NULL,
	"advance_paise" bigint DEFAULT 0 NOT NULL,
	"status" "repair_status" DEFAULT 'received' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"promised_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"assigned_to" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repairs_job_no_unique" UNIQUE("job_no")
);
--> statement-breakpoint
CREATE TABLE "sales_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_no" varchar(30) NOT NULL,
	"customer_id" integer,
	"branch_id" integer,
	"invoice_date" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" "sale_channel" DEFAULT 'pos' NOT NULL,
	"gold_rate_22k_paise" bigint DEFAULT 0 NOT NULL,
	"subtotal_paise" bigint DEFAULT 0 NOT NULL,
	"making_paise" bigint DEFAULT 0 NOT NULL,
	"wastage_paise" bigint DEFAULT 0 NOT NULL,
	"stone_paise" bigint DEFAULT 0 NOT NULL,
	"gst_paise" bigint DEFAULT 0 NOT NULL,
	"discount_paise" bigint DEFAULT 0 NOT NULL,
	"old_gold_value_paise" bigint DEFAULT 0 NOT NULL,
	"round_off_paise" bigint DEFAULT 0 NOT NULL,
	"total_paise" bigint DEFAULT 0 NOT NULL,
	"paid_paise" bigint DEFAULT 0 NOT NULL,
	"due_paise" bigint DEFAULT 0 NOT NULL,
	"status" "invoice_status" DEFAULT 'paid' NOT NULL,
	"payment_mode" "payment_mode" DEFAULT 'cash' NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_invoices_invoice_no_unique" UNIQUE("invoice_no")
);
--> statement-breakpoint
CREATE TABLE "sales_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"product_id" integer,
	"description" varchar(200) NOT NULL,
	"hsn" varchar(12) DEFAULT '7113' NOT NULL,
	"purity" varchar(10) DEFAULT '22K' NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"gross_weight_mg" integer DEFAULT 0 NOT NULL,
	"net_weight_mg" integer DEFAULT 0 NOT NULL,
	"rate_per_gram_paise" bigint DEFAULT 0 NOT NULL,
	"metal_value_paise" bigint DEFAULT 0 NOT NULL,
	"making_paise" bigint DEFAULT 0 NOT NULL,
	"wastage_paise" bigint DEFAULT 0 NOT NULL,
	"stone_paise" bigint DEFAULT 0 NOT NULL,
	"gst_rate_bp" integer DEFAULT 300 NOT NULL,
	"gst_paise" bigint DEFAULT 0 NOT NULL,
	"total_paise" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(80) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"branch_id" integer,
	"designation" varchar(80),
	"phone" varchar(20),
	"joined_at" date,
	"commission_bp" integer DEFAULT 0 NOT NULL,
	"sales_target_paise" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"branch_id" integer,
	"type" "stock_movement_type" NOT NULL,
	"qty" integer DEFAULT 0 NOT NULL,
	"weight_mg" integer DEFAULT 0 NOT NULL,
	"reference_type" varchar(40),
	"reference_id" integer,
	"note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(24) NOT NULL,
	"name" varchar(160) NOT NULL,
	"contact_person" varchar(120),
	"mobile" varchar(15),
	"email" varchar(160),
	"gstin" varchar(20),
	"address" text,
	"city" varchar(80),
	"state" varchar(80),
	"outstanding_paise" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suppliers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'salesman' NOT NULL,
	"phone" text,
	"designation" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "old_gold_purchases" ADD CONSTRAINT "old_gold_purchases_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "old_gold_purchases" ADD CONSTRAINT "old_gold_purchases_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "old_gold_purchases" ADD CONSTRAINT "old_gold_purchases_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_date_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "metal_rates_lookup_idx" ON "metal_rates" USING btree ("metal","purity","effective_from");--> statement-breakpoint
CREATE INDEX "old_gold_customer_idx" ON "old_gold_purchases" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "old_gold_date_idx" ON "old_gold_purchases" USING btree ("date");--> statement-breakpoint
CREATE INDEX "payments_invoice_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payments_date_idx" ON "payments" USING btree ("paid_at");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_branch_idx" ON "products" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_metal_idx" ON "products" USING btree ("metal_type");--> statement-breakpoint
CREATE INDEX "purchase_items_purchase_idx" ON "purchase_items" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "purchases_supplier_idx" ON "purchases" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "purchases_date_idx" ON "purchases" USING btree ("purchase_date");--> statement-breakpoint
CREATE INDEX "repairs_customer_idx" ON "repairs" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "repairs_status_idx" ON "repairs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sales_invoices_customer_idx" ON "sales_invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sales_invoices_date_idx" ON "sales_invoices" USING btree ("invoice_date");--> statement-breakpoint
CREATE INDEX "sales_invoices_branch_idx" ON "sales_invoices" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "sales_invoices_status_idx" ON "sales_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sales_items_invoice_idx" ON "sales_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "staff_profiles_branch_idx" ON "staff_profiles" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "stock_movements_product_idx" ON "stock_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_movements_date_idx" ON "stock_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");