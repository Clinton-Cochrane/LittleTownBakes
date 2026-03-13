-- Flavor requests: customers can request archived flavors to return
-- Run this in Supabase SQL Editor or via Supabase CLI

CREATE TABLE IF NOT EXISTS flavor_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'ignored')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flavor_requests_item_id ON flavor_requests (item_id);
CREATE INDEX IF NOT EXISTS idx_flavor_requests_status ON flavor_requests (status);

COMMENT ON TABLE flavor_requests IS 'Customer requests for archived flavors. item_id matches menu.json id.';
