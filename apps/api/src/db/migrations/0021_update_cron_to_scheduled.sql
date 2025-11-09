-- Update workflow type from 'cron' to 'scheduled'
UPDATE workflows SET type = 'scheduled' WHERE type = 'cron';
