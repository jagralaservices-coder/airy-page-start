CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'owner',
    'store_manager',
    'staff'
);


--
-- Name: generate_8_digit_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_8_digit_code() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  new_code TEXT;
BEGIN
  new_code := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
  RETURN new_code;
END;
$$;


--
-- Name: get_user_customer_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_customer_id(user_uuid uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT customer_id FROM public.user_roles 
  WHERE user_id = user_uuid AND is_active = true 
  LIMIT 1;
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(user_uuid uuid) RETURNS public.user_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = user_uuid AND is_active = true 
  LIMIT 1;
$$;


--
-- Name: get_user_store_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_store_id(user_uuid uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT store_id FROM public.user_roles 
  WHERE user_id = user_uuid AND is_active = true 
  LIMIT 1;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(user_uuid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = 'admin' AND is_active = true
  );
$$;


--
-- Name: is_owner(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_owner(user_uuid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = 'owner' AND is_active = true
  );
$$;


--
-- Name: set_staff_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_staff_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
    SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE staff_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  NEW.staff_code := new_code;
  RETURN NEW;
END;
$$;


--
-- Name: set_store_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_store_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
    SELECT EXISTS(SELECT 1 FROM public.stores WHERE store_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  NEW.store_code := new_code;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_store_login(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_store_login(p_store_code text, p_password text) RETURNS TABLE(store_id uuid, store_name text, store_address text, store_phone text, customer_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.store_name,
    s.address,
    s.phone,
    s.customer_id
  FROM stores s
  WHERE s.store_code = p_store_code 
    AND s.password = p_password 
    AND s.is_active = true;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_name text NOT NULL,
    owner_email text NOT NULL,
    owner_name text NOT NULL,
    phone text,
    address text,
    subscription_plan text DEFAULT 'trial'::text,
    subscription_start date DEFAULT CURRENT_DATE,
    subscription_end date DEFAULT (CURRENT_DATE + '14 days'::interval),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    max_stores integer DEFAULT 2 NOT NULL
);


--
-- Name: inventory_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_inventory_id text NOT NULL,
    child_inventory_id text NOT NULL,
    quantity_required numeric DEFAULT 1 NOT NULL,
    unit text DEFAULT 'g'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: menu_item_ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_item_ingredients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_item_id uuid NOT NULL,
    inventory_item_id text NOT NULL,
    quantity_required numeric DEFAULT 1 NOT NULL,
    unit text DEFAULT 'g'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    name text NOT NULL,
    name_hindi text,
    price numeric DEFAULT 0 NOT NULL,
    category text DEFAULT 'General'::text NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    stock integer,
    preparation_time integer,
    image_url text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    linked_inventory_id text,
    gramage_per_unit numeric DEFAULT 0
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    phone text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    store_id uuid NOT NULL,
    check_in_time timestamp with time zone DEFAULT now() NOT NULL,
    check_out_time timestamp with time zone,
    check_in_latitude numeric,
    check_in_longitude numeric,
    check_in_distance integer,
    check_out_latitude numeric,
    check_out_longitude numeric,
    check_out_distance integer,
    status text DEFAULT 'checked_in'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    verification_method text DEFAULT 'face'::text,
    CONSTRAINT staff_attendance_status_check CHECK ((status = ANY (ARRAY['checked_in'::text, 'checked_out'::text])))
);


--
-- Name: stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    store_name text NOT NULL,
    address text,
    phone text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    store_code text,
    password text
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.user_role NOT NULL,
    customer_id uuid,
    store_id uuid,
    pin text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    staff_code text,
    face_photo_url text,
    work_start_time time without time zone DEFAULT '09:00:00'::time without time zone,
    work_end_time time without time zone DEFAULT '18:00:00'::time without time zone,
    fingerprint_enabled boolean DEFAULT false
);


--
-- Name: customers customers_owner_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_owner_email_key UNIQUE (owner_email);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: inventory_components inventory_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_components
    ADD CONSTRAINT inventory_components_pkey PRIMARY KEY (id);


--
-- Name: menu_item_ingredients menu_item_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_ingredients
    ADD CONSTRAINT menu_item_ingredients_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: staff_attendance staff_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_pkey PRIMARY KEY (id);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: stores stores_store_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_store_code_key UNIQUE (store_code);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_staff_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_staff_code_key UNIQUE (staff_code);


--
-- Name: user_roles user_roles_user_id_role_store_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_store_id_key UNIQUE (user_id, role, store_id);


--
-- Name: idx_menu_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_category ON public.menu_items USING btree (category);


--
-- Name: idx_menu_items_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_store_id ON public.menu_items USING btree (store_id);


--
-- Name: idx_staff_attendance_check_in; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_attendance_check_in ON public.staff_attendance USING btree (check_in_time);


--
-- Name: idx_staff_attendance_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_attendance_store_id ON public.staff_attendance USING btree (store_id);


--
-- Name: idx_staff_attendance_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_attendance_user_id ON public.staff_attendance USING btree (user_id);


--
-- Name: user_roles trigger_set_staff_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_staff_code BEFORE INSERT ON public.user_roles FOR EACH ROW WHEN ((new.staff_code IS NULL)) EXECUTE FUNCTION public.set_staff_code();


--
-- Name: stores trigger_set_store_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_store_code BEFORE INSERT ON public.stores FOR EACH ROW WHEN ((new.store_code IS NULL)) EXECUTE FUNCTION public.set_store_code();


--
-- Name: customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: menu_items update_menu_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stores update_stores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: menu_items menu_items_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: staff_attendance staff_attendance_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_attendance
    ADD CONSTRAINT staff_attendance_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: stores stores_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: customers Admins can manage all customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all customers" ON public.customers USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: menu_items Admins can manage all items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all items" ON public.menu_items USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles USING (public.is_admin(auth.uid()));


--
-- Name: stores Admins can manage all stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all stores" ON public.stores USING (public.is_admin(auth.uid()));


--
-- Name: staff_attendance Admins can view all attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all attendance" ON public.staff_attendance FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: inventory_components Allow all operations on inventory_components; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all operations on inventory_components" ON public.inventory_components USING (true) WITH CHECK (true);


--
-- Name: menu_item_ingredients Allow all operations on menu_item_ingredients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all operations on menu_item_ingredients" ON public.menu_item_ingredients USING (true) WITH CHECK (true);


--
-- Name: menu_items Allow menu operations for active stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow menu operations for active stores" ON public.menu_items USING ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = menu_items.store_id) AND (stores.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.stores
  WHERE ((stores.id = menu_items.store_id) AND (stores.is_active = true)))));


--
-- Name: stores Allow store login verification; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow store login verification" ON public.stores FOR SELECT USING (true);


--
-- Name: menu_items Owners can manage items in their stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage items in their stores" ON public.menu_items USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.customer_id = public.get_user_customer_id(auth.uid()))))) WITH CHECK ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.customer_id = public.get_user_customer_id(auth.uid())))));


--
-- Name: user_roles Owners can manage roles in their customer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage roles in their customer" ON public.user_roles USING ((public.is_owner(auth.uid()) AND (customer_id = public.get_user_customer_id(auth.uid()))));


--
-- Name: stores Owners can manage stores in their customer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage stores in their customer" ON public.stores USING ((customer_id = public.get_user_customer_id(auth.uid())));


--
-- Name: customers Owners can view own customer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can view own customer" ON public.customers FOR SELECT USING ((id = public.get_user_customer_id(auth.uid())));


--
-- Name: staff_attendance Owners can view store attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can view store attendance" ON public.staff_attendance FOR SELECT USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.customer_id = public.get_user_customer_id(auth.uid())))));


--
-- Name: staff_attendance Staff can check in; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can check in" ON public.staff_attendance FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: staff_attendance Staff can check out; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can check out" ON public.staff_attendance FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: menu_items Staff can manage items in their store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage items in their store" ON public.menu_items USING ((store_id = public.get_user_store_id(auth.uid()))) WITH CHECK ((store_id = public.get_user_store_id(auth.uid())));


--
-- Name: staff_attendance Staff can view own attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view own attendance" ON public.staff_attendance FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: menu_items Store managers can manage own store items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Store managers can manage own store items" ON public.menu_items USING ((store_id = public.get_user_store_id(auth.uid()))) WITH CHECK ((store_id = public.get_user_store_id(auth.uid())));


--
-- Name: stores Store managers can view own store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Store managers can view own store" ON public.stores FOR SELECT USING ((id = public.get_user_store_id(auth.uid())));


--
-- Name: staff_attendance Store managers can view store attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Store managers can view store attendance" ON public.staff_attendance FOR SELECT USING ((store_id = public.get_user_store_id(auth.uid())));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_components; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_components ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_item_ingredients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: stores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;