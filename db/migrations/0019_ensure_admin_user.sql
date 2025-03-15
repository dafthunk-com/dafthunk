-- Ensure admin user exists for existing workflows
INSERT INTO users (id, name, email, provider, created_at, updated_at)
SELECT 'admin', 'Admin User', 'admin@example.com', 'system', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 'admin'); 