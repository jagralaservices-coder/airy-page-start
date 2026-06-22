-- Enable pgcrypto extension (required for gen_salt and crypt functions used in PIN/password hashing triggers)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;