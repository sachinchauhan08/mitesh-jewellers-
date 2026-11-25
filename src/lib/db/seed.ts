import "dotenv/config";
import { sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "./index";
import * as s from "./all-schema";
import { calculateInvoiceTotals, calculateItem, estimateOldGold } from "../pricing";

const IMAGES = [
  "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?auto=format&fit=crop&w=900&q=80",
];

let seedState = 42;
function rnd(): number {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}
function int(min: number, max: number): number {
  return Math.floor(rnd() * (max - min + 1)) + min;
}
function daysAgo(days: number, hour = 12): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, int(0, 59), 0, 0);
  return d;
}

async function main() {
  console.log("Resetting demo data…");
  await db.execute(sql`
    TRUNCATE TABLE
      activity_logs, stock_movements, repairs, old_gold_purchases,
      purchase_items, purchases, payments, sales_items, sales_invoices,
      products, categories, metal_rates, customers, suppliers,
      staff_profiles, branches, settings, document_counters,
      session, account, verification, "user"
    RESTART IDENTITY CASCADE
  `);

  const branches = await db
    .insert(s.branches)
    .values([
      {
        name: "Mitesh Jewellers — Babra",
        code: "BAB",
        address: "Mahadev Complex, Main Bazaar Rd, Babra",
        city: "Babra",
        phone: "094272 61465",
        gstin: "24AABCA1234M1Z5",
      },
    ])
    .returning();

  const password = await hashPassword("Admin@12345");
  const staff = [
    { name: "Mitesh Patel", email: "admin@miteshjewellers.in", role: "admin", designation: "Owner" },
    { name: "Priya Shah", email: "manager@miteshjewellers.in", role: "manager", designation: "Showroom Manager" },
    { name: "Amit Verma", email: "cashier@miteshjewellers.in", role: "cashier", designation: "Head Cashier" },
    { name: "Sneha Kulkarni", email: "sales@miteshjewellers.in", role: "salesman", designation: "Sales Executive" },
    { name: "Karan Desai", email: "accounts@miteshjewellers.in", role: "accountant", designation: "Accounts Officer" },
  ];

  for (let i = 0; i < staff.length; i++) {
    const person = staff[i];
    const userId = `user_${i + 1}`;
    await db.insert(s.user).values({
      id: userId,
      name: person.name,
      email: person.email,
      emailVerified: true,
      role: person.role,
      phone: `98${int(10000000, 99999999)}`,
      designation: person.designation,
    });
    await db.insert(s.account).values({
      id: `account_${i + 1}`,
      accountId: userId,
      providerId: "credential",
      userId,
      password,
    });
    await db.insert(s.staffProfiles).values({
      userId,
      branchId: branches[i % branches.length].id,
      designation: person.designation,
      phone: `98${int(10000000, 99999999)}`,
      joinedAt: `202${int(0, 4)}-0${int(1, 9)}-1${int(0, 9)}`,
      commissionBp: person.role === "salesman" ? 150 : 0,
      salesTargetPaise: person.role === "salesman" ? 2500000 : 0,
    });
  }

  const catDefs: { name: string; slug: string; metal: "gold" | "silver" | "platinum" | "other"; image: string }[] = [
    { name: "Gold Jewellery", slug: "gold-jewellery", metal: "gold", image: IMAGES[0] },
    { name: "Silver Jewellery", slug: "silver-jewellery", metal: "silver", image: IMAGES[9] },
    { name: "Diamond Jewellery", slug: "diamond-jewellery", metal: "gold", image: IMAGES[2] },
    { name: "Platinum Jewellery", slug: "platinum-jewellery", metal: "platinum", image: IMAGES[6] },
    { name: "Gold Coins", slug: "gold-coins", metal: "gold", image: IMAGES[7] },
    { name: "Gold Bars", slug: "gold-bars", metal: "gold", image: IMAGES[7] },
    { name: "Bridal Jewellery", slug: "bridal-jewellery", metal: "gold", image: IMAGES[1] },
    { name: "Rings", slug: "rings", metal: "gold", image: IMAGES[3] },
    { name: "Necklaces", slug: "necklaces", metal: "gold", image: IMAGES[5] },
    { name: "Earrings", slug: "earrings", metal: "gold", image: IMAGES[4] },
    { name: "Bangles", slug: "bangles", metal: "gold", image: IMAGES[8] },
    { name: "Chains", slug: "chains", metal: "gold", image: IMAGES[5] },
    { name: "Bracelets", slug: "bracelets", metal: "gold", image: IMAGES[8] },
    { name: "Pendants", slug: "pendants", metal: "gold", image: IMAGES[6] },
  ];
  const categories = await db
    .insert(s.categories)
    .values(
      catDefs.map((c, i) => ({
        name: c.name,
        slug: c.slug,
        metalType: c.metal,
        imageUrl: c.image,
        description: `${c.name} crafted in our atelier with certified purity and transparent making charges.`,
        sortOrder: i,
      })),
    )
    .returning();
  const catId = (slug: string) => categories.find((c) => c.slug === slug)!.id;

  const rateRows: { metal: "gold" | "silver" | "platinum"; purity: string; base: number }[] = [
    { metal: "gold", purity: "24K", base: 1045000 },
    { metal: "gold", purity: "22K", base: 958000 },
    { metal: "gold", purity: "20K", base: 871000 },
    { metal: "gold", purity: "18K", base: 784000 },
    { metal: "silver", purity: "999", base: 11800 },
    { metal: "platinum", purity: "950", base: 420000 },
  ];
  const rateValues: (typeof s.metalRates.$inferInsert)[] = [];
  for (let d = 30; d >= 0; d--) {
    for (const r of rateRows) {
      const drift = 1 + (rnd() - 0.45) * 0.018;
      rateValues.push({
        metal: r.metal,
        purity: r.purity,
        ratePerGramPaise: Math.round((r.base * drift) / 100) * 100,
        effectiveFrom: daysAgo(d, 10),
        source: "IBJA",
        isAuthorized: true,
        createdBy: "Mitesh Patel",
        note: d === 0 ? "Morning rate card" : null,
      });
    }
  }
  await db.insert(s.metalRates).values(rateValues);
  const latest = rateRows.map((r) => ({
    metal: r.metal,
    purity: r.purity,
    rate: rateValues.filter((v) => v.metal === r.metal && v.purity === r.purity).at(-1)!.ratePerGramPaise,
  }));
  const rateOf = (metal: string, purity: string) =>
    latest.find((r) => r.metal === metal && r.purity === purity)?.rate ?? 0;

  type ProductSeed = {
    name: string;
    cat: string;
    metal: "gold" | "silver" | "platinum" | "other";
    purity: string;
    gross: number;
    net: number;
    stone?: number;
    diamond?: number;
    makingType: "per_gram" | "per_piece" | "percent";
    making: number;
    wastage: number;
    stoneCharge?: number;
    stock: number;
    featured?: boolean;
  };

  const productSeeds: ProductSeed[] = [
    { name: "Aurelia Temple Necklace", cat: "necklaces", metal: "gold", purity: "22K", gross: 48500, net: 46200, makingType: "per_gram", making: 62000, wastage: 800, stock: 3, featured: true },
    { name: "Meera Bridal Choker Set", cat: "bridal-jewellery", metal: "gold", purity: "22K", gross: 76200, net: 71800, stone: 1200, makingType: "percent", making: 1400, wastage: 900, stoneCharge: 1850000, stock: 2, featured: true },
    { name: "Solitaire Halo Ring", cat: "rings", metal: "gold", purity: "18K", gross: 4800, net: 4300, diamond: 420, makingType: "per_piece", making: 1250000, wastage: 300, stock: 6, featured: true },
    { name: "Kundan Jhumka Earrings", cat: "earrings", metal: "gold", purity: "22K", gross: 15800, net: 14200, stone: 600, makingType: "per_gram", making: 75000, wastage: 700, stoneCharge: 640000, stock: 8, featured: true },
    { name: "Classic Rope Chain 20in", cat: "chains", metal: "gold", purity: "22K", gross: 22400, net: 22300, makingType: "per_gram", making: 38000, wastage: 500, stock: 12 },
    { name: "Nakshi Kada Bangle Pair", cat: "bangles", metal: "gold", purity: "22K", gross: 64800, net: 63200, makingType: "per_gram", making: 68000, wastage: 1000, stock: 4 },
    { name: "Diamond Tennis Bracelet", cat: "bracelets", metal: "gold", purity: "18K", gross: 12500, net: 10900, diamond: 1100, makingType: "per_piece", making: 2850000, wastage: 200, stock: 3, featured: true },
    { name: "Lotus Motif Pendant", cat: "pendants", metal: "gold", purity: "22K", gross: 6200, net: 5900, makingType: "per_gram", making: 82000, wastage: 600, stock: 10 },
    { name: "Heritage Polki Necklace", cat: "bridal-jewellery", metal: "gold", purity: "22K", gross: 92400, net: 85600, stone: 2600, makingType: "percent", making: 1600, wastage: 900, stoneCharge: 4250000, stock: 1, featured: true },
    { name: "Everyday Gold Hoops", cat: "earrings", metal: "gold", purity: "18K", gross: 3400, net: 3300, makingType: "per_piece", making: 480000, wastage: 400, stock: 18 },
    { name: "Silver Oxidised Jhumka", cat: "silver-jewellery", metal: "silver", purity: "999", gross: 28600, net: 28400, makingType: "per_piece", making: 165000, wastage: 0, stock: 22 },
    { name: "Silver Payal Pair", cat: "silver-jewellery", metal: "silver", purity: "999", gross: 42000, net: 41800, makingType: "per_gram", making: 9000, wastage: 0, stock: 15 },
    { name: "Platinum Eternity Band", cat: "platinum-jewellery", metal: "platinum", purity: "950", gross: 5600, net: 5400, makingType: "per_piece", making: 1850000, wastage: 200, stock: 5 },
    { name: "24K Gold Coin 10g", cat: "gold-coins", metal: "gold", purity: "24K", gross: 10000, net: 10000, makingType: "percent", making: 200, wastage: 0, stock: 30, featured: true },
    { name: "24K Gold Coin 5g", cat: "gold-coins", metal: "gold", purity: "24K", gross: 5000, net: 5000, makingType: "percent", making: 250, wastage: 0, stock: 40 },
    { name: "24K Gold Bar 50g", cat: "gold-bars", metal: "gold", purity: "24K", gross: 50000, net: 50000, makingType: "percent", making: 150, wastage: 0, stock: 6 },
    { name: "Antique Coin Necklace", cat: "gold-jewellery", metal: "gold", purity: "22K", gross: 38200, net: 36900, makingType: "per_gram", making: 58000, wastage: 900, stock: 5 },
    { name: "Ruby Drop Earrings", cat: "earrings", metal: "gold", purity: "18K", gross: 8900, net: 7900, stone: 550, makingType: "per_piece", making: 1650000, wastage: 300, stoneCharge: 1250000, stock: 4 },
    { name: "Emerald Cocktail Ring", cat: "rings", metal: "gold", purity: "18K", gross: 7200, net: 6300, stone: 480, makingType: "per_piece", making: 2150000, wastage: 300, stoneCharge: 1850000, stock: 3 },
    { name: "Minimal Gold Nose Pin", cat: "gold-jewellery", metal: "gold", purity: "18K", gross: 900, net: 850, makingType: "per_piece", making: 185000, wastage: 300, stock: 25 },
    { name: "Broad Cuff Bracelet", cat: "bracelets", metal: "gold", purity: "22K", gross: 28600, net: 27400, makingType: "per_gram", making: 72000, wastage: 800, stock: 6 },
    { name: "Lakshmi Coin Pendant", cat: "pendants", metal: "gold", purity: "22K", gross: 4400, net: 4200, makingType: "per_gram", making: 65000, wastage: 500, stock: 14 },
    { name: "Diamond Stud Earrings", cat: "diamond-jewellery", metal: "gold", purity: "18K", gross: 2600, net: 2200, diamond: 380, makingType: "per_piece", making: 2250000, wastage: 200, stock: 9, featured: true },
    { name: "Diamond Solitaire Pendant", cat: "diamond-jewellery", metal: "gold", purity: "18K", gross: 3100, net: 2600, diamond: 460, makingType: "per_piece", making: 1950000, wastage: 200, stock: 7 },
    { name: "Mangalsutra Classic", cat: "necklaces", metal: "gold", purity: "22K", gross: 18600, net: 17800, makingType: "per_gram", making: 48000, wastage: 700, stock: 11 },
    { name: "Silver Idol — Ganesha", cat: "silver-jewellery", metal: "silver", purity: "999", gross: 68000, net: 68000, makingType: "per_piece", making: 385000, wastage: 0, stock: 4 },
    { name: "Platinum Solitaire Ring", cat: "platinum-jewellery", metal: "platinum", purity: "950", gross: 4200, net: 3900, diamond: 320, makingType: "per_piece", making: 3250000, wastage: 200, stock: 2 },
    { name: "Gold Charm Bracelet", cat: "bracelets", metal: "gold", purity: "22K", gross: 9800, net: 9400, makingType: "per_gram", making: 55000, wastage: 600, stock: 8 },
    { name: "Temple Jhumka with Pearls", cat: "earrings", metal: "gold", purity: "22K", gross: 21200, net: 19800, stone: 900, makingType: "per_gram", making: 78000, wastage: 800, stoneCharge: 920000, stock: 5 },
    { name: "Baby Gold Bangles Pair", cat: "bangles", metal: "gold", purity: "22K", gross: 11200, net: 11000, makingType: "per_gram", making: 52000, wastage: 500, stock: 9 },
  ];

  const productValues = productSeeds.map((p, i) => {
    const rate = rateOf(p.metal, p.purity);
    const price = calculateItem({
      netWeightMg: p.net,
      qty: 1,
      ratePerGramPaise: rate,
      makingChargeType: p.makingType,
      makingChargeValue: p.making,
      wastageBp: p.wastage,
      stoneChargesPaise: p.stoneCharge ?? 0,
      gstRateBp: 300,
    });
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return {
      sku: `AJ-${String(i + 1).padStart(4, "0")}`,
      barcode: `8901234${String(100000 + i)}`,
      name: p.name,
      slug,
      description: `${p.name} in ${p.purity} ${p.metal}, hand-finished at the Mitesh workshop. BIS hallmarked with transparent making and wastage charges.`,
      categoryId: catId(p.cat),
      branchId: branches[i % branches.length].id,
      metalType: p.metal,
      purity: p.purity,
      grossWeightMg: p.gross,
      netWeightMg: p.net,
      stoneWeightMg: p.stone ?? 0,
      diamondWeightMg: p.diamond ?? 0,
      makingChargeType: p.makingType,
      makingChargeValue: p.making,
      wastageBp: p.wastage,
      stoneChargesPaise: p.stoneCharge ?? 0,
      huid: `HUID${int(100000, 999999)}`,
      purchasePricePaise: Math.round(price.totalPaise * 0.82),
      sellingPricePaise: price.totalPaise,
      stockQty: p.stock,
      minStockQty: 3,
      status: "active" as const,
      images: [IMAGES[i % IMAGES.length], IMAGES[(i + 3) % IMAGES.length]],
      tags: [p.metal, p.purity, p.cat],
      isFeatured: Boolean(p.featured),
    };
  });
  const products = await db.insert(s.products).values(productValues).returning();

  const stockRows = products.map((p) => ({
    productId: p.id,
    branchId: p.branchId,
    type: "opening" as const,
    qty: p.stockQty,
    weightMg: p.netWeightMg * p.stockQty,
    referenceType: "seed",
    note: "Opening stock",
    createdBy: "Mitesh Patel",
  }));
  await db.insert(s.stockMovements).values(stockRows);

  const customerSeeds = [
    { name: "Ananya Iyer", mobile: "9820011001", city: "Babra", dob: "1990-04-12", anniv: "2016-11-26" },
    { name: "Vikram Rathore", mobile: "9820022002", city: "Amreli", dob: "1984-09-03", anniv: "2012-02-14" },
    { name: "Neha Kapoor", mobile: "9820033003", city: "Babra", dob: "1993-01-22", anniv: "2019-12-08" },
    { name: "Arjun Nair", mobile: "9820044004", city: "Rajkot", dob: "1988-07-19", anniv: "2015-05-21" },
    { name: "Kavya Reddy", mobile: "9820055005", city: "Botad", dob: "1995-03-30", anniv: "2021-01-18" },
    { name: "Sanjay Agarwal", mobile: "9820066006", city: "Babra", dob: "1978-12-11", anniv: "2004-04-27" },
    { name: "Ritika Jain", mobile: "9820077007", city: "Bhavnagar", dob: "1991-08-25", anniv: "2018-07-09" },
    { name: "Rahul Shetty", mobile: "9820088008", city: "Ahmedabad", dob: "1986-05-16", anniv: "2013-10-12" },
    { name: "Pooja Bhatt", mobile: "9820099009", city: "Amreli", dob: "1997-11-02", anniv: "2023-03-05" },
    { name: "Manish Gupta", mobile: "9820010010", city: "Rajkot", dob: "1982-06-07", anniv: "2009-09-19" },
    { name: "Shreya Menon", mobile: "9820011011", city: "Babra", dob: "1994-02-14", anniv: "2020-06-30" },
    { name: "Deepak Choudhary", mobile: "9820012012", city: "Bhavnagar", dob: "1975-10-09", anniv: "2001-12-01" },
  ];
  const customers = await db
    .insert(s.customers)
    .values(
      customerSeeds.map((c, i) => ({
        code: `CUS-${String(i + 1).padStart(4, "0")}`,
        name: c.name,
        mobile: c.mobile,
        email: `${c.name.split(" ")[0].toLowerCase()}${i}@example.com`,
        address: `${int(1, 90)} ${pick(["Sunrise", "Palm", "Lotus", "Silver Oak"])} Residency`,
        city: c.city,
        state: "Gujarat",
        pincode: c.city === "Babra" ? "365421" : c.city === "Amreli" ? "365601" : c.city === "Rajkot" ? "360001" : c.city === "Bhavnagar" ? "364001" : c.city === "Ahmedabad" ? "380001" : "364710",
        dateOfBirth: c.dob,
        anniversary: c.anniv,
        loyaltyPoints: int(40, 1200),
        preferences: pick(["Prefers 22K bridal sets", "Likes minimalist diamond pieces", "Enquires about silver gifting", "Prefers antique finishes"]),
      })),
    )
    .returning();

  const suppliers = await db
    .insert(s.suppliers)
    .values([
      { code: "SUP-0001", name: "Rajasthan Bullion House", contactPerson: "Mahesh Soni", mobile: "9811100001", email: "sales@rajbullion.in", gstin: "08AABCR1234R1Z9", city: "Jaipur", state: "Rajasthan", outstandingPaise: 0 },
      { code: "SUP-0002", name: "Surat Diamond Co.", contactPerson: "Jignesh Patel", mobile: "9811100002", email: "orders@suratdiamond.in", gstin: "24AABCS5678S1Z4", city: "Surat", state: "Gujarat", outstandingPaise: 0 },
      { code: "SUP-0003", name: "Mumbai Silver Works", contactPerson: "Farhan Ansari", mobile: "9811100003", email: "hello@mumbaisilver.in", gstin: "27AABCM9012M1Z1", city: "Mumbai", state: "Maharashtra", outstandingPaise: 0 },
      { code: "SUP-0004", name: "Kundan Artisans Collective", contactPerson: "Rakesh Soni", mobile: "9811100004", city: "Jaipur", state: "Rajasthan", outstandingPaise: 0 },
      { code: "SUP-0005", name: "Platinum Guild Trading", contactPerson: "Meera Rao", mobile: "9811100005", city: "Mumbai", state: "Maharashtra", outstandingPaise: 0 },
      { code: "SUP-0006", name: "Chennai Temple Jewellers", contactPerson: "Lakshmi Narayanan", mobile: "9811100006", city: "Chennai", state: "Tamil Nadu", outstandingPaise: 0 },
    ])
    .returning();

  const today = new Date();
  const invoiceRows: (typeof s.salesInvoices.$inferInsert)[] = [];
  const itemRowsByInvoice: (typeof s.salesItems.$inferInsert)[][] = [];
  const paymentDrafts: { invoiceIndex: number; row: typeof s.payments.$inferInsert }[] = [];
  const movementRows: (typeof s.stockMovements.$inferInsert)[] = [];
  const customerOutstanding = new Map<number, number>();

  for (let i = 0; i < 46; i++) {
    const daysBack = i < 4 ? 0 : int(1, 59);
    const date = daysAgo(daysBack, int(10, 19));
    const customer = pick(customers);
    const branch = pick(branches);
    const itemCount = int(1, 3);
    const chosen: typeof products = [];
    for (let k = 0; k < itemCount; k++) {
      const candidate = pick(products);
      if (!chosen.find((c) => c.id === candidate.id)) chosen.push(candidate);
    }
    const items = chosen.map((product) => {
      const rate = rateOf(product.metalType, product.purity);
      const priced = calculateItem({
        netWeightMg: product.netWeightMg,
        qty: 1,
        ratePerGramPaise: rate,
        makingChargeType: product.makingChargeType,
        makingChargeValue: product.makingChargeValue,
        wastageBp: product.wastageBp,
        stoneChargesPaise: product.stoneChargesPaise,
        gstRateBp: 300,
      });
      return {
        productId: product.id,
        description: product.name,
        hsn: "7113",
        purity: product.purity,
        qty: 1,
        grossWeightMg: product.grossWeightMg,
        netWeightMg: product.netWeightMg,
        ratePerGramPaise: rate,
        metalValuePaise: priced.metalValuePaise,
        makingPaise: priced.makingPaise,
        wastagePaise: priced.wastagePaise,
        stonePaise: priced.stonePaise,
        gstRateBp: 300,
        gstPaise: priced.gstPaise,
        totalPaise: priced.totalPaise,
      };
    });
    const discount = rnd() > 0.7 ? Math.round((items.reduce((a, b) => a + b.totalPaise, 0) * 0.02) / 100) * 100 : 0;
    const totals = calculateInvoiceTotals({
      items: items.map((it) => ({
        metalValuePaise: it.metalValuePaise,
        makingPaise: it.makingPaise,
        wastagePaise: it.wastagePaise,
        stonePaise: it.stonePaise,
        taxablePaise: 0,
        gstPaise: it.gstPaise,
        totalPaise: it.totalPaise,
      })),
      discountPaise: discount,
      oldGoldValuePaise: 0,
    });
    const paidFull = rnd() > 0.22;
    const paid = paidFull ? totals.totalPaise : Math.round((totals.totalPaise * int(20, 70)) / 100 / 100) * 100;
    const status = paidFull ? "paid" : paid > 0 ? "partial" : "unpaid";
    const mode = pick(["cash", "upi", "card", "bank"] as const);
    invoiceRows.push({
      invoiceNo: `INV-${String(i + 1).padStart(4, "0")}`,
      customerId: customer.id,
      branchId: branch.id,
      invoiceDate: date,
      channel: "pos",
      goldRate22kPaise: rateOf("gold", "22K"),
      subtotalPaise: totals.subtotalPaise,
      makingPaise: totals.makingPaise,
      wastagePaise: totals.wastagePaise,
      stonePaise: totals.stonePaise,
      gstPaise: totals.gstPaise,
      discountPaise: totals.discountPaise,
      oldGoldValuePaise: 0,
      roundOffPaise: totals.roundOffPaise,
      totalPaise: totals.totalPaise,
      paidPaise: paid,
      duePaise: totals.totalPaise - paid,
      status,
      paymentMode: mode,
      createdBy: pick(staff).name,
      createdAt: date,
    });
    itemRowsByInvoice.push(items.map((it) => ({ ...it, invoiceId: 0 })));
    if (paid > 0) {
      paymentDrafts.push({
        invoiceIndex: i,
        row: {
        customerId: customer.id,
        direction: "in",
        mode,
        amountPaise: paid,
        reference: mode === "upi" ? `UPI${int(100000, 999999)}` : null,
        paidAt: date,
        createdBy: "Amit Verma",
        },
      });
    }
    if (!paidFull) {
      customerOutstanding.set(customer.id, (customerOutstanding.get(customer.id) ?? 0) + (totals.totalPaise - paid));
    }
    for (const it of items) {
      movementRows.push({
        productId: it.productId!,
        branchId: branch.id,
        type: "sale",
        qty: -1,
        weightMg: -it.netWeightMg,
        referenceType: "invoice",
        note: "POS sale",
        createdBy: "Amit Verma",
        createdAt: date,
      });
    }
  }

  const insertedInvoices = await db.insert(s.salesInvoices).values(invoiceRows).returning();
  const allItems = itemRowsByInvoice.flatMap((items, idx) =>
    items.map((it) => ({ ...it, invoiceId: insertedInvoices[idx].id })),
  );
  await db.insert(s.salesItems).values(allItems);
  await db.insert(s.payments).values(
    paymentDrafts.map((d) => ({
      ...d.row,
      invoiceId: insertedInvoices[d.invoiceIndex]?.id ?? null,
    })),
  );
  await db.insert(s.stockMovements).values(movementRows);

  for (const [customerId, amount] of customerOutstanding) {
    await db
      .update(s.customers)
      .set({ outstandingPaise: amount })
      .where(sql`${s.customers.id} = ${customerId}`);
  }

  const purchaseSeeds = [
    { supplier: 0, type: "raw_gold" as const, items: [{ desc: "24K raw gold biscuit", metal: "gold" as const, purity: "24K", weight: 250000, rate: rateOf("gold", "24K") }], days: 24 },
    { supplier: 1, type: "finished" as const, items: [{ desc: "Diamond studs — 18K", metal: "gold" as const, purity: "18K", weight: 18000, rate: rateOf("gold", "18K") }], days: 18 },
    { supplier: 2, type: "finished" as const, items: [{ desc: "Silver payal lot", metal: "silver" as const, purity: "999", weight: 120000, rate: rateOf("silver", "999") }], days: 14 },
    { supplier: 3, type: "finished" as const, items: [{ desc: "Kundan bridal set", metal: "gold" as const, purity: "22K", weight: 68000, rate: rateOf("gold", "22K") }], days: 11 },
    { supplier: 4, type: "raw_gold" as const, items: [{ desc: "Platinum grain", metal: "platinum" as const, purity: "950", weight: 12000, rate: rateOf("platinum", "950") }], days: 9 },
    { supplier: 5, type: "finished" as const, items: [{ desc: "Temple necklace lot", metal: "gold" as const, purity: "22K", weight: 96000, rate: rateOf("gold", "22K") }], days: 6 },
    { supplier: 0, type: "old_gold" as const, items: [{ desc: "Customer old gold lot", metal: "gold" as const, purity: "22K", weight: 42000, rate: rateOf("gold", "22K") }], days: 3 },
  ];
  const supplierDue = new Map<number, number>();
  for (let i = 0; i < purchaseSeeds.length; i++) {
    const p = purchaseSeeds[i];
    const date = daysAgo(p.days, 11);
    const lines = p.items.map((it) => {
      const amount = Math.round((it.weight / 1000) * it.rate);
      return { ...it, amount };
    });
    const subtotal = lines.reduce((a, b) => a + b.amount, 0);
    const gst = Math.round(subtotal * 0.03);
    const total = subtotal + gst;
    const paid = i % 3 === 0 ? total : Math.round(total * 0.6);
    const supplier = suppliers[p.supplier];
    const [purchase] = await db
      .insert(s.purchases)
      .values({
        purchaseNo: `PUR-${String(i + 1).padStart(4, "0")}`,
        supplierId: supplier.id,
        branchId: branches[i % branches.length].id,
        type: p.type,
        purchaseDate: date,
        subtotalPaise: subtotal,
        gstPaise: gst,
        totalPaise: total,
        paidPaise: paid,
        duePaise: total - paid,
        status: paid === total ? "paid" : "partial",
        createdBy: "Priya Shah",
        createdAt: date,
      })
      .returning();
    await db.insert(s.purchaseItems).values(
      lines.map((l) => ({
        purchaseId: purchase.id,
        description: l.desc,
        metalType: l.metal,
        purity: l.purity,
        qty: 1,
        weightMg: l.weight,
        ratePerGramPaise: l.rate,
        amountPaise: l.amount,
      })),
    );
    if (paid < total) supplierDue.set(supplier.id, (supplierDue.get(supplier.id) ?? 0) + (total - paid));
  }
  for (const [supplierId, amount] of supplierDue) {
    await db.update(s.suppliers).set({ outstandingPaise: amount }).where(sql`${s.suppliers.id} = ${supplierId}`);
  }

  for (let i = 0; i < 7; i++) {
    const customer = pick(customers);
    const gross = int(4, 40) * 1000;
    const purity = pick([7500, 8350, 9160]);
    const rate = rateOf("gold", "22K");
    const est = estimateOldGold({
      grossWeightMg: gross,
      purityBp: purity,
      meltingLossBp: 200,
      ratePerGramPaise: rate,
      deductionBp: 400,
    });
    await db.insert(s.oldGoldPurchases).values({
      receiptNo: `OG-${String(i + 1).padStart(4, "0")}`,
      customerId: customer.id,
      branchId: pick(branches).id,
      date: daysAgo(int(1, 45), 15),
      grossWeightMg: gross,
      purityBp: purity,
      meltingLossBp: 200,
      netWeightMg: est.netWeightMg,
      ratePerGramPaise: rate,
      deductionBp: 400,
      finalValuePaise: est.finalValuePaise,
      settlementType: pick(["cash", "exchange"] as const),
      notes: "Purity tested on Karatmeter; customer present.",
      createdBy: "Amit Verma",
    });
  }

  const repairs = [
    { desc: "Pearl strand restringing", issue: "Thread worn out, clasp loose", cost: 185000, status: "in_progress" as const, days: 2 },
    { desc: "Diamond ring resizing", issue: "Resize from 12 to 14", cost: 320000, status: "ready" as const, days: 4 },
    { desc: "Bangle dent repair", issue: "Dent on inner curve", cost: 240000, status: "delivered" as const, days: 9 },
    { desc: "Mangalsutra polish", issue: "Rhodium polish and cleaning", cost: 95000, status: "received" as const, days: 1 },
    { desc: "Earring post replacement", issue: "Broken screw post", cost: 120000, status: "ready" as const, days: 3 },
    { desc: "Antique necklace clasp", issue: "Clasp does not lock", cost: 210000, status: "in_progress" as const, days: 5 },
    { desc: "Silver idol polishing", issue: "Tarnish removal", cost: 65000, status: "delivered" as const, days: 12 },
    { desc: "Gold chain soldering", issue: "Snapped near hook", cost: 85000, status: "received" as const, days: 0 },
  ];
  await db.insert(s.repairs).values(
    repairs.map((r, i) => ({
      jobNo: `JOB-${String(i + 1).padStart(4, "0")}`,
      customerId: pick(customers).id,
      branchId: pick(branches).id,
      itemDescription: r.desc,
      metalType: "gold" as const,
      grossWeightMg: int(2, 30) * 1000,
      issue: r.issue,
      estimatedCostPaise: r.cost,
      advancePaise: r.status === "delivered" ? r.cost : Math.round(r.cost * 0.4),
      status: r.status,
      receivedAt: daysAgo(r.days, 12),
      promisedAt: daysAgo(r.days - 5, 18),
      deliveredAt: r.status === "delivered" ? daysAgo(Math.max(r.days - 2, 0), 16) : null,
      assignedTo: pick(["Mohan Karigar", "Suresh Karigar", "Imran Karigar"]),
      notes: "Handle with care; customer notified on WhatsApp.",
    })),
  );

  await db.insert(s.settings).values([
    { key: "company_name", value: "Mitesh Jewellers" },
    { key: "company_address", value: "12 Kalbadevi Road, Zaveri Bazaar, Mumbai 400002" },
    { key: "company_gstin", value: "27AABCA1234M1Z5" },
    { key: "company_phone", value: "+91 22 2240 1122" },
    { key: "company_email", value: "care@miteshjewellers.in" },
    { key: "gst_rate_bp", value: "300" },
    { key: "weight_precision", value: "3" },
    { key: "loyalty_rate_bp", value: "100" },
    { key: "invoice_footer", value: "Thank you for choosing Mitesh Jewellers. BIS hallmarking on all gold jewellery." },
  ]);

  await db.insert(s.documentCounters).values([
    { docType: "invoice", prefix: "INV", nextNumber: 47 },
    { docType: "purchase", prefix: "PUR", nextNumber: 8 },
    { docType: "old_gold", prefix: "OG", nextNumber: 8 },
    { docType: "repair", prefix: "JOB", nextNumber: 9 },
    { docType: "customer", prefix: "CUS", nextNumber: 13 },
    { docType: "supplier", prefix: "SUP", nextNumber: 7 },
  ]);

  await db.insert(s.activityLogs).values([
    { userName: "Mitesh Patel", action: "rate.updated", entity: "metal_rate", detail: "22K gold revised to ₹9,580/g" },
    { userName: "Priya Shah", action: "purchase.created", entity: "purchase", detail: "PUR-0006 from Chennai Temple Jewellers" },
    { userName: "Amit Verma", action: "invoice.created", entity: "invoice", detail: "INV-0046 billed at Babra showroom" },
  ]);

  console.log(`Seed complete: ${products.length} products, ${customers.length} customers, ${insertedInvoices.length} invoices.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
