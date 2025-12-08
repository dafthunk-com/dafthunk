-- Add Stripe billing fields to organizations table
ALTER TABLE organizations ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE organizations ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE organizations ADD COLUMN subscription_status TEXT;
ALTER TABLE organizations ADD COLUMN current_period_start INTEGER;
ALTER TABLE organizations ADD COLUMN current_period_end INTEGER;

-- Create indexes for Stripe lookups
CREATE INDEX organizations_stripe_customer_id_idx ON organizations(stripe_customer_id);
CREATE INDEX organizations_stripe_subscription_id_idx ON organizations(stripe_subscription_id);
CREATE INDEX organizations_subscription_status_idx ON organizations(subscription_status);
