-- Delete and recreate easyRFQ db
\echo 'Delete and recreate easy_rfq db?'
\prompt 'Return for yes or control-C to cancel > ' foo

SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'easy_rfq' AND pid <> pg_backend_pid();

-- Drop and create the easyRFQ database
DROP DATABASE IF EXISTS easy_rfq;
CREATE DATABASE easy_rfq;

-- Now, connect to the new easy_rfq database
\connect easy_rfq

-- Run the schema and seed files
\i ./schemas/easyRFQ-schema.sql
\i ./schemas/easyRFQ-seed.sql

-- Repeat the same for easyRFQ_test
\echo 'Delete and recreate easy_rfq_test db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE IF EXISTS easy_rfq_test;
CREATE DATABASE easy_rfq_test;

-- Now, connect to the new easyRFQ_test database
\connect easy_rfq_test

-- Run the schema file for the test db
\i ./schemas/easyRFQ-schema.sql