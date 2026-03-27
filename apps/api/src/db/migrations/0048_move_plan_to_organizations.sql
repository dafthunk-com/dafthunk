-- Remove plan from users (now derived from organization subscription info)
DROP INDEX IF EXISTS users_plan_idx;
ALTER TABLE users DROP COLUMN plan;
