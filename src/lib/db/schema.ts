import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

const money = (name: string) => bigint(name, { mode: "number" });

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "manager",
  "cashier",
  "salesman",
  "accountant",
]);

export const metalTypeEnum = pgEnum("metal_type", [
  "gold",
  "silver",
  "platinum",
  "other",
]);

export const productStatusEnum = pgEnum("product_status", [
  "active",
  "draft",
  "archived",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "paid",
  "partial",
  "unpaid",
  "cancelled",
]);

export const channelEnum = pgEnum("sale_channel", ["pos", "online"]);

export const paymentModeEnum = pgEnum("payment_mode", [
  "cash",
  "upi",
  "card",
  "bank",
  "cheque",
  "advance",
]);

export const paymentDirectionEnum = pgEnum("payment_direction", ["in", "out"]);

export const purchaseTypeEnum = pgEnum("purchase_type", [
  "raw_gold",
  "finished",
  "old_gold",
]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "opening",
  "purchase",
  "sale",
  "adjustment",
  "transfer_in",
  "transfer_out",
  "return",
]);

export const repairStatusEnum = pgEnum("repair_status", [
  "received",
  "in_progress",
  "ready",
  "delivered",
  "cancelled",
]);

export const settlementTypeEnum = pgEnum("settlement_type", [
  "cash",
  "exchange",
  "bank",
]);

export const makingChargeTypeEnum = pgEnum("making_charge_type", [
  "per_gram",
  "per_piece",
  "percent",
]);

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  address: text("address"),
  city: varchar("city", { length: 80 }),
  phone: varchar("phone", { length: 20 }),
  gstin: varchar("gstin", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const staffProfiles = pgTable(
  "staff_profiles",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().unique(),
    branchId: integer("branch_id").references(() => branches.id, { onDelete: "set null" }),
    designation: varchar("designation", { length: 80 }),
    phone: varchar("phone", { length: 20 }),
    joinedAt: date("joined_at"),
    commissionBp: integer("commission_bp").notNull().default(0),
    salesTargetPaise: money("sales_target_paise").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("staff_profiles_branch_idx").on(table.branchId)],
);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    parentId: integer("parent_id"),
    metalType: metalTypeEnum("metal_type").notNull().default("gold"),
    description: text("description"),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => [index("categories_parent_idx").on(table.parentId)],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    sku: varchar("sku", { length: 40 }).notNull().unique(),
    barcode: varchar("barcode", { length: 60 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull().unique(),
    description: text("description"),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    branchId: integer("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    metalType: metalTypeEnum("metal_type").notNull().default("gold"),
    purity: varchar("purity", { length: 10 }).notNull().default("22K"),
    grossWeightMg: integer("gross_weight_mg").notNull().default(0),
    netWeightMg: integer("net_weight_mg").notNull().default(0),
    stoneWeightMg: integer("stone_weight_mg").notNull().default(0),
    diamondWeightMg: integer("diamond_weight_mg").notNull().default(0),
    makingChargeType: makingChargeTypeEnum("making_charge_type")
      .notNull()
      .default("per_gram"),
    makingChargeValue: integer("making_charge_value").notNull().default(0),
    wastageBp: integer("wastage_bp").notNull().default(0),
    stoneChargesPaise: money("stone_charges_paise").notNull().default(0),
    huid: varchar("huid", { length: 30 }),
    purchasePricePaise: money("purchase_price_paise").notNull().default(0),
    sellingPricePaise: money("selling_price_paise").notNull().default(0),
    stockQty: integer("stock_qty").notNull().default(0),
    minStockQty: integer("min_stock_qty").notNull().default(1),
    status: productStatusEnum("status").notNull().default("active"),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    isFeatured: boolean("is_featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("products_category_idx").on(table.categoryId),
    index("products_branch_idx").on(table.branchId),
    index("products_status_idx").on(table.status),
    index("products_metal_idx").on(table.metalType),
  ],
);

export const metalRates = pgTable(
  "metal_rates",
  {
    id: serial("id").primaryKey(),
    metal: metalTypeEnum("metal").notNull(),
    purity: varchar("purity", { length: 10 }).notNull(),
    ratePerGramPaise: money("rate_per_gram_paise").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true })
      .notNull()
      .defaultNow(),
    source: varchar("source", { length: 60 }).notNull().default("manual"),
    isAuthorized: boolean("is_authorized").notNull().default(true),
    note: text("note"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("metal_rates_lookup_idx").on(
      table.metal,
      table.purity,
      table.effectiveFrom,
    ),
  ],
);

export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 24 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    mobile: varchar("mobile", { length: 15 }).notNull().unique(),
    email: varchar("email", { length: 160 }),
    address: text("address"),
    city: varchar("city", { length: 80 }),
    state: varchar("state", { length: 80 }),
    pincode: varchar("pincode", { length: 10 }),
    dateOfBirth: date("date_of_birth"),
    anniversary: date("anniversary"),
    gender: varchar("gender", { length: 16 }),
    loyaltyPoints: integer("loyalty_points").notNull().default(0),
    advancePaise: money("advance_paise").notNull().default(0),
    outstandingPaise: money("outstanding_paise").notNull().default(0),
    preferences: text("preferences"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("customers_name_idx").on(table.name)],
);

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 24 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  contactPerson: varchar("contact_person", { length: 120 }),
  mobile: varchar("mobile", { length: 15 }),
  email: varchar("email", { length: 160 }),
  gstin: varchar("gstin", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 80 }),
  state: varchar("state", { length: 80 }),
  outstandingPaise: money("outstanding_paise").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salesInvoices = pgTable(
  "sales_invoices",
  {
    id: serial("id").primaryKey(),
    invoiceNo: varchar("invoice_no", { length: 30 }).notNull().unique(),
    customerId: integer("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    branchId: integer("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    invoiceDate: timestamp("invoice_date", { withTimezone: true }).notNull().defaultNow(),
    channel: channelEnum("channel").notNull().default("pos"),
    goldRate22kPaise: money("gold_rate_22k_paise").notNull().default(0),
    subtotalPaise: money("subtotal_paise").notNull().default(0),
    makingPaise: money("making_paise").notNull().default(0),
    wastagePaise: money("wastage_paise").notNull().default(0),
    stonePaise: money("stone_paise").notNull().default(0),
    gstPaise: money("gst_paise").notNull().default(0),
    discountPaise: money("discount_paise").notNull().default(0),
    oldGoldValuePaise: money("old_gold_value_paise").notNull().default(0),
    roundOffPaise: money("round_off_paise").notNull().default(0),
    totalPaise: money("total_paise").notNull().default(0),
    paidPaise: money("paid_paise").notNull().default(0),
    duePaise: money("due_paise").notNull().default(0),
    status: invoiceStatusEnum("status").notNull().default("paid"),
    paymentMode: paymentModeEnum("payment_mode").notNull().default("cash"),
    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sales_invoices_customer_idx").on(table.customerId),
    index("sales_invoices_date_idx").on(table.invoiceDate),
    index("sales_invoices_branch_idx").on(table.branchId),
    index("sales_invoices_status_idx").on(table.status),
  ],
);

export const salesItems = pgTable(
  "sales_items",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => salesInvoices.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    description: varchar("description", { length: 200 }).notNull(),
    hsn: varchar("hsn", { length: 12 }).notNull().default("7113"),
    purity: varchar("purity", { length: 10 }).notNull().default("22K"),
    qty: integer("qty").notNull().default(1),
    grossWeightMg: integer("gross_weight_mg").notNull().default(0),
    netWeightMg: integer("net_weight_mg").notNull().default(0),
    ratePerGramPaise: money("rate_per_gram_paise").notNull().default(0),
    metalValuePaise: money("metal_value_paise").notNull().default(0),
    makingPaise: money("making_paise").notNull().default(0),
    wastagePaise: money("wastage_paise").notNull().default(0),
    stonePaise: money("stone_paise").notNull().default(0),
    gstRateBp: integer("gst_rate_bp").notNull().default(300),
    gstPaise: money("gst_paise").notNull().default(0),
    totalPaise: money("total_paise").notNull().default(0),
  },
  (table) => [index("sales_items_invoice_idx").on(table.invoiceId)],
);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoice_id").references(() => salesInvoices.id, {
      onDelete: "cascade",
    }),
    purchaseId: integer("purchase_id"),
    customerId: integer("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    supplierId: integer("supplier_id").references(() => suppliers.id, {
      onDelete: "set null",
    }),
    direction: paymentDirectionEnum("direction").notNull().default("in"),
    mode: paymentModeEnum("mode").notNull().default("cash"),
    amountPaise: money("amount_paise").notNull(),
    reference: varchar("reference", { length: 80 }),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
    notes: text("notes"),
    createdBy: text("created_by"),
  },
  (table) => [
    index("payments_invoice_idx").on(table.invoiceId),
    index("payments_date_idx").on(table.paidAt),
  ],
);

export const purchases = pgTable(
  "purchases",
  {
    id: serial("id").primaryKey(),
    purchaseNo: varchar("purchase_no", { length: 30 }).notNull().unique(),
    supplierId: integer("supplier_id").references(() => suppliers.id, {
      onDelete: "restrict",
    }),
    branchId: integer("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    type: purchaseTypeEnum("type").notNull().default("finished"),
    purchaseDate: timestamp("purchase_date", { withTimezone: true }).notNull().defaultNow(),
    subtotalPaise: money("subtotal_paise").notNull().default(0),
    gstPaise: money("gst_paise").notNull().default(0),
    totalPaise: money("total_paise").notNull().default(0),
    paidPaise: money("paid_paise").notNull().default(0),
    duePaise: money("due_paise").notNull().default(0),
    status: invoiceStatusEnum("status").notNull().default("paid"),
    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("purchases_supplier_idx").on(table.supplierId),
    index("purchases_date_idx").on(table.purchaseDate),
  ],
);

export const purchaseItems = pgTable(
  "purchase_items",
  {
    id: serial("id").primaryKey(),
    purchaseId: integer("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    description: varchar("description", { length: 200 }).notNull(),
    metalType: metalTypeEnum("metal_type").notNull().default("gold"),
    purity: varchar("purity", { length: 10 }).notNull().default("22K"),
    qty: integer("qty").notNull().default(1),
    weightMg: integer("weight_mg").notNull().default(0),
    ratePerGramPaise: money("rate_per_gram_paise").notNull().default(0),
    amountPaise: money("amount_paise").notNull().default(0),
  },
  (table) => [index("purchase_items_purchase_idx").on(table.purchaseId)],
);

export const oldGoldPurchases = pgTable(
  "old_gold_purchases",
  {
    id: serial("id").primaryKey(),
    receiptNo: varchar("receipt_no", { length: 30 }).notNull().unique(),
    customerId: integer("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    branchId: integer("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
    grossWeightMg: integer("gross_weight_mg").notNull().default(0),
    purityBp: integer("purity_bp").notNull().default(9160),
    meltingLossBp: integer("melting_loss_bp").notNull().default(0),
    netWeightMg: integer("net_weight_mg").notNull().default(0),
    ratePerGramPaise: money("rate_per_gram_paise").notNull().default(0),
    deductionBp: integer("deduction_bp").notNull().default(0),
    finalValuePaise: money("final_value_paise").notNull().default(0),
    settlementType: settlementTypeEnum("settlement_type").notNull().default("cash"),
    invoiceId: integer("invoice_id").references(() => salesInvoices.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("old_gold_customer_idx").on(table.customerId),
    index("old_gold_date_idx").on(table.date),
  ],
);

export const repairs = pgTable(
  "repairs",
  {
    id: serial("id").primaryKey(),
    jobNo: varchar("job_no", { length: 30 }).notNull().unique(),
    customerId: integer("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    branchId: integer("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    itemDescription: varchar("item_description", { length: 200 }).notNull(),
    metalType: metalTypeEnum("metal_type").notNull().default("gold"),
    grossWeightMg: integer("gross_weight_mg").notNull().default(0),
    issue: text("issue"),
    estimatedCostPaise: money("estimated_cost_paise").notNull().default(0),
    advancePaise: money("advance_paise").notNull().default(0),
    status: repairStatusEnum("status").notNull().default("received"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    promisedAt: timestamp("promised_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    assignedTo: text("assigned_to"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("repairs_customer_idx").on(table.customerId),
    index("repairs_status_idx").on(table.status),
  ],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    branchId: integer("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    type: stockMovementTypeEnum("type").notNull(),
    qty: integer("qty").notNull().default(0),
    weightMg: integer("weight_mg").notNull().default(0),
    referenceType: varchar("reference_type", { length: 40 }),
    referenceId: integer("reference_id"),
    note: text("note"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("stock_movements_product_idx").on(table.productId),
    index("stock_movements_date_idx").on(table.createdAt),
  ],
);

export const settings = pgTable("settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documentCounters = pgTable("document_counters", {
  docType: varchar("doc_type", { length: 30 }).primaryKey(),
  prefix: varchar("prefix", { length: 12 }).notNull(),
  nextNumber: integer("next_number").notNull().default(1),
});

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id"),
    userName: varchar("user_name", { length: 120 }),
    action: varchar("action", { length: 60 }).notNull(),
    entity: varchar("entity", { length: 40 }).notNull(),
    entityId: varchar("entity_id", { length: 40 }),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("activity_logs_date_idx").on(table.createdAt)],
);

export type Branch = typeof branches.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type MetalRate = typeof metalRates.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type SalesInvoice = typeof salesInvoices.$inferSelect;
export type SalesItem = typeof salesItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type OldGoldPurchase = typeof oldGoldPurchases.$inferSelect;
export type Repair = typeof repairs.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type StaffProfile = typeof staffProfiles.$inferSelect;
