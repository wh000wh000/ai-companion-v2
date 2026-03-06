-- 支付订单表：添加幂等键专用列（替代 description 字段污染）
ALTER TABLE "payment_orders" ADD COLUMN IF NOT EXISTS "idempotency_key" text UNIQUE;
--> statement-breakpoint
-- 为现有使用 description 存储幂等键的记录迁移数据
UPDATE "payment_orders"
SET "idempotency_key" = SUBSTRING("description" FROM 13)
WHERE "description" LIKE 'idempotency:%' AND "idempotency_key" IS NULL;
--> statement-breakpoint
-- 清理 description 字段中的幂等键前缀
UPDATE "payment_orders"
SET "description" = '充值'
WHERE "description" LIKE 'idempotency:%';
