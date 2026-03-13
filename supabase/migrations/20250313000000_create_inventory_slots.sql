-- Inventory slots: quantity per item per period (week or month)
-- Run this in Supabase SQL Editor or via Supabase CLI

CREATE TABLE IF NOT EXISTS inventory_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id TEXT NOT NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('week', 'month')),
    period_start DATE NOT NULL,
    quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
    quantity_sold INTEGER NOT NULL DEFAULT 0 CHECK (quantity_sold >= 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (item_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_inventory_slots_item_period
    ON inventory_slots (item_id, period_type, period_start);

COMMENT ON TABLE inventory_slots IS 'Tracks available quantity per menu item per period. item_id matches menu.json id.';
