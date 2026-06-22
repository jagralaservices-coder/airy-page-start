
-- Fix existing plaintext passwords by re-hashing them
UPDATE public.stores
SET password = crypt(password, gen_salt('bf', 10))
WHERE password IS NOT NULL AND password != '' AND LEFT(password, 2) != '$2';

-- Fix existing plaintext pins
UPDATE public.user_roles
SET pin = crypt(pin, gen_salt('bf', 10))
WHERE pin IS NOT NULL AND pin != '' AND LEFT(pin, 2) != '$2';
