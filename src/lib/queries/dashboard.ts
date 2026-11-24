import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";

async function queryRows<T>(statement: SQL): Promise<T[]> {
  const result = await db.execute(statement);
  return (result as unknown as { rows: T[] }).rows;
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData(branchId?: number) {
  const branch = branchId ? sql`AND branch_id = ${branchId}` : sql``;
  const invBranch = branchId ? sql`AND inv.branch_id = ${branchId}` : sql``;

  const [totals] = await queryRows<{
    total_sales: string;
    today_sales: string;
    month_sales: string;
    sales_due: string;
    invoice_count: string;
  }>(sql`
    SELECT
      coalesce(sum(total_paise), 0) AS total_sales,
      coalesce(sum(CASE WHEN invoice_date >= current_date THEN total_paise ELSE 0 END), 0) AS today_sales,
      coalesce(sum(CASE WHEN invoice_date >= date_trunc('month', current_date) THEN total_paise ELSE 0 END), 0) AS month_sales,
      coalesce(sum(due_paise), 0) AS sales_due,
      count(*) AS invoice_count
    FROM sales_invoices
    WHERE status <> 'cancelled' ${branch}
  `);

  const [purchaseTotals] = await queryRows<{
    total_purchase: string;
    month_purchase: string;
    purchase_due: string;
  }>(sql`
    SELECT
      coalesce(sum(total_paise), 0) AS total_purchase,
      coalesce(sum(CASE WHEN purchase_date >= date_trunc('month', current_date) THEN total_paise ELSE 0 END), 0) AS month_purchase,
      coalesce(sum(due_paise), 0) AS purchase_due
    FROM purchases
  `);

  const [stock] = await queryRows<{
    stock_cost: string;
    stock_retail: string;
    gold_mg: string;
    silver_mg: string;
    diamond_mg: string;
    low_stock_count: string;
    product_count: string;
  }>(sql`
    SELECT
      coalesce(sum(purchase_price_paise * stock_qty), 0) AS stock_cost,
      coalesce(sum(selling_price_paise * stock_qty), 0) AS stock_retail,
      coalesce(sum(CASE WHEN metal_type = 'gold' THEN net_weight_mg * stock_qty ELSE 0 END), 0) AS gold_mg,
      coalesce(sum(CASE WHEN metal_type = 'silver' THEN net_weight_mg * stock_qty ELSE 0 END), 0) AS silver_mg,
      coalesce(sum(diamond_weight_mg * stock_qty), 0) AS diamond_mg,
      count(*) FILTER (WHERE stock_qty <= min_stock_qty) AS low_stock_count,
      count(*) AS product_count
    FROM products
    WHERE status = 'active'
  `);

  const [relationships] = await queryRows<{
    customers: string;
    suppliers: string;
    customer_outstanding: string;
    supplier_outstanding: string;
  }>(sql`
    SELECT
      (SELECT count(*) FROM customers WHERE is_active) AS customers,
      (SELECT count(*) FROM suppliers WHERE is_active) AS suppliers,
      (SELECT coalesce(sum(outstanding_paise), 0) FROM customers) AS customer_outstanding,
      (SELECT coalesce(sum(outstanding_paise), 0) FROM suppliers) AS supplier_outstanding
  `);

  const [cash] = await queryRows<{ cash_in: string; bank_in: string; cash_out: string; bank_out: string }>(sql`
    SELECT
      coalesce(sum(CASE WHEN mode = 'cash' THEN amount_paise ELSE 0 END) FILTER (WHERE direction = 'in'), 0) AS cash_in,
      coalesce(sum(CASE WHEN mode IN ('bank','upi','card','cheque') THEN amount_paise ELSE 0 END) FILTER (WHERE direction = 'in'), 0) AS bank_in,
      coalesce(sum(CASE WHEN mode = 'cash' THEN amount_paise ELSE 0 END) FILTER (WHERE direction = 'out'), 0) AS cash_out,
      coalesce(sum(CASE WHEN mode IN ('bank','upi','card','cheque') THEN amount_paise ELSE 0 END) FILTER (WHERE direction = 'out'), 0) AS bank_out
    FROM payments
  `);

  const [profit] = await queryRows<{ gross_profit: string }>(sql`
    SELECT coalesce(sum(si.total_paise - si.gst_paise - coalesce(p.purchase_price_paise, 0) * si.qty), 0) AS gross_profit
    FROM sales_items si
    JOIN sales_invoices inv ON inv.id = si.invoice_id
    LEFT JOIN products p ON p.id = si.product_id
    WHERE inv.status <> 'cancelled' ${invBranch}
  `);

  const series = await queryRows<{ day: string; sales: string; invoices: string }>(sql`
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
           coalesce(sum(inv.total_paise), 0) AS sales,
           count(inv.id) AS invoices
    FROM generate_series(current_date - interval '13 days', current_date, interval '1 day') AS d(day)
    LEFT JOIN sales_invoices inv
      ON inv.invoice_date::date = d.day AND inv.status <> 'cancelled' ${branchId ? sql`AND inv.branch_id = ${branchId}` : sql``}
    GROUP BY d.day
    ORDER BY d.day
  `);

  const purchaseSeries = await queryRows<{ month: string; purchases: string }>(sql`
    SELECT to_char(d.month, 'Mon') AS month,
           coalesce(sum(p.total_paise), 0) AS purchases
    FROM generate_series(date_trunc('month', current_date) - interval '5 months', date_trunc('month', current_date), interval '1 month') AS d(month)
    LEFT JOIN purchases p ON date_trunc('month', p.purchase_date) = d.month
    GROUP BY d.month
    ORDER BY d.month
  `);

  const categoryMix = await queryRows<{ name: string; value: string; weight: string }>(sql`
    SELECT c.name,
           coalesce(sum(si.total_paise), 0) AS value,
           coalesce(sum(si.net_weight_mg), 0) AS weight
    FROM sales_items si
    JOIN sales_invoices inv ON inv.id = si.invoice_id
    LEFT JOIN products p ON p.id = si.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE inv.status <> 'cancelled' ${invBranch}
    GROUP BY c.name
    ORDER BY value DESC
    LIMIT 6
  `);

  const recent = await queryRows<{
    id: number;
    invoice_no: string;
    customer: string | null;
    total_paise: string;
    paid_paise: string;
    status: string;
    invoice_date: string;
    channel: string;
    branch: string | null;
  }>(sql`
    SELECT inv.id, inv.invoice_no, c.name AS customer, inv.total_paise, inv.paid_paise,
           inv.status, inv.invoice_date, inv.channel, b.name AS branch
    FROM sales_invoices inv
    LEFT JOIN customers c ON c.id = inv.customer_id
    LEFT JOIN branches b ON b.id = inv.branch_id
    WHERE inv.status <> 'cancelled' ${invBranch}
    ORDER BY inv.invoice_date DESC, inv.id DESC
    LIMIT 7
  `);

  const lowStock = await queryRows<{
    id: number;
    name: string;
    sku: string;
    stock_qty: number;
    min_stock_qty: number;
    metal_type: string;
    purity: string;
  }>(sql`
    SELECT id, name, sku, stock_qty, min_stock_qty, metal_type, purity
    FROM products
    WHERE status = 'active' AND stock_qty <= min_stock_qty
    ORDER BY stock_qty ASC, name ASC
    LIMIT 6
  `);

  const topProducts = await queryRows<{ name: string; qty: string; value: string }>(sql`
    SELECT si.description AS name, sum(si.qty) AS qty, sum(si.total_paise) AS value
    FROM sales_items si
    JOIN sales_invoices inv ON inv.id = si.invoice_id
    WHERE inv.status <> 'cancelled' ${invBranch}
    GROUP BY si.description
    ORDER BY value DESC
    LIMIT 5
  `);

  const paymentMix = await queryRows<{ mode: string; value: string }>(sql`
    SELECT mode, sum(amount_paise) AS value
    FROM payments
    WHERE direction = 'in'
    GROUP BY mode
    ORDER BY value DESC
  `);

  const rateHistory = await queryRows<{ effective_from: string; rate: string }>(sql`
    SELECT effective_from, rate_per_gram_paise AS rate
    FROM metal_rates
    WHERE metal = 'gold' AND purity = '22K' AND is_authorized
    ORDER BY effective_from ASC
    LIMIT 40
  `);

  const rateGrid = await queryRows<{ metal: string; purity: string; rate: string; effective_from: string }>(sql`
    SELECT DISTINCT ON (metal, purity) metal, purity, rate_per_gram_paise AS rate, effective_from
    FROM metal_rates
    WHERE is_authorized
    ORDER BY metal, purity, effective_from DESC
  `);

  const branches = await queryRows<{ id: number; name: string; code: string }>(sql`
    SELECT id, name, code FROM branches WHERE is_active ORDER BY name
  `);

  const n = (v: unknown) => Number(v ?? 0);

  return {
    totals: {
      totalSales: n(totals?.total_sales),
      todaySales: n(totals?.today_sales),
      monthSales: n(totals?.month_sales),
      salesDue: n(totals?.sales_due),
      invoiceCount: n(totals?.invoice_count),
    },
    purchases: {
      total: n(purchaseTotals?.total_purchase),
      month: n(purchaseTotals?.month_purchase),
      due: n(purchaseTotals?.purchase_due),
    },
    stock: {
      cost: n(stock?.stock_cost),
      retail: n(stock?.stock_retail),
      goldMg: n(stock?.gold_mg),
      silverMg: n(stock?.silver_mg),
      diamondMg: n(stock?.diamond_mg),
      lowStockCount: n(stock?.low_stock_count),
      productCount: n(stock?.product_count),
    },
    relationships: {
      customers: n(relationships?.customers),
      suppliers: n(relationships?.suppliers),
      customerOutstanding: n(relationships?.customer_outstanding),
      supplierOutstanding: n(relationships?.supplier_outstanding),
    },
    cash: {
      inHand: n(cash?.cash_in) - n(cash?.cash_out),
      bank: n(cash?.bank_in) - n(cash?.bank_out),
    },
    grossProfit: n(profit?.gross_profit),
    series: series.map((row) => ({
      day: row.day,
      sales: n(row.sales),
      invoices: n(row.invoices),
    })),
    purchaseSeries: purchaseSeries.map((row) => ({
      month: row.month,
      purchases: n(row.purchases),
    })),
    categoryMix: categoryMix.map((row) => ({
      name: row.name ?? "Uncategorised",
      value: n(row.value),
      weight: n(row.weight),
    })),
    recent: recent.map((row) => ({
      id: row.id,
      invoiceNo: row.invoice_no,
      customer: row.customer ?? "Walk-in customer",
      totalPaise: n(row.total_paise),
      paidPaise: n(row.paid_paise),
      status: row.status,
      invoiceDate: row.invoice_date,
      channel: row.channel,
      branch: row.branch,
    })),
    lowStock: lowStock.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      stockQty: Number(row.stock_qty),
      minStockQty: Number(row.min_stock_qty),
      metalType: row.metal_type,
      purity: row.purity,
    })),
    topProducts: topProducts.map((row) => ({
      name: row.name,
      qty: n(row.qty),
      value: n(row.value),
    })),
    paymentMix: paymentMix.map((row) => ({ mode: row.mode, value: n(row.value) })),
    rateHistory: rateHistory.map((row) => ({
      date: row.effective_from,
      rate: n(row.rate),
    })),
    rateGrid: rateGrid.map((row) => ({
      metal: row.metal,
      purity: row.purity,
      rate: n(row.rate),
      effectiveFrom: row.effective_from,
    })),
    branches,
  };
}
