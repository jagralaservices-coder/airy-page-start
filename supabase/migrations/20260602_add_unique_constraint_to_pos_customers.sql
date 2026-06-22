-- Clean duplicate pos_customers records and add a unique constraint

-- Step 1: Normalize empty strings to NULL to allow multiple customers with no phone number
UPDATE pos_customers SET phone = NULL WHERE phone = '';

-- Step 2: Delete duplicate customer records within the same store, keeping the oldest one
DELETE FROM pos_customers a
USING pos_customers b
WHERE (a.created_at > b.created_at OR (a.created_at = b.created_at AND a.id > b.id))
  AND a.store_id = b.store_id
  AND a.phone = b.phone
  AND a.phone IS NOT NULL;

-- Step 3: Add UNIQUE constraint on (store_id, phone)
ALTER TABLE pos_customers ADD CONSTRAINT pos_customers_store_id_phone_unique UNIQUE (store_id, phone);
