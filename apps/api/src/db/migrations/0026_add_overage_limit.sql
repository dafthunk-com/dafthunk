-- Add overage_limit column to organizations table
-- NULL means unlimited additional usage
ALTER TABLE organizations ADD COLUMN overage_limit INTEGER;
