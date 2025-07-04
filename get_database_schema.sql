-- =====================================================
-- GET COMPLETE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor to get the actual schema
-- =====================================================

-- =====================================================
-- 1. GET ALL TABLES IN YOUR DATABASE
-- =====================================================

SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- 2. GET ALL COLUMNS FOR EACH TABLE
-- =====================================================

SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length,
  numeric_precision,
  numeric_scale
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- =====================================================
-- 3. GET ALL CONSTRAINTS (PRIMARY KEYS, FOREIGN KEYS, ETC.)
-- =====================================================

SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;

-- =====================================================
-- 4. GET ALL INDEXES
-- =====================================================

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =====================================================
-- 5. GET DETAILED TABLE STRUCTURE (ALTERNATIVE VIEW)
-- =====================================================

SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  CASE 
    WHEN pk.column_name IS NOT NULL THEN 'PRIMARY KEY'
    WHEN fk.column_name IS NOT NULL THEN 'FOREIGN KEY'
    ELSE ''
  END as key_type,
  fk.foreign_table_name,
  fk.foreign_column_name
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
  ON t.table_name = c.table_name
LEFT JOIN (
  SELECT 
    kcu.table_name,
    kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
LEFT JOIN (
  SELECT 
    kcu.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- =====================================================
-- 6. GET ROW LEVEL SECURITY STATUS
-- =====================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  hasrls as has_rls_policies
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- 7. GET EXISTING RLS POLICIES
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 8. GET FUNCTIONS AND TRIGGERS
-- =====================================================

-- Functions
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- 9. GET VIEWS
-- =====================================================

SELECT 
  table_name,
  view_definition
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- 10. SUMMARY QUERY - QUICK OVERVIEW
-- =====================================================

SELECT 
  'Tables' as object_type,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
  'Views' as object_type,
  COUNT(*) as count
FROM information_schema.views 
WHERE table_schema = 'public'

UNION ALL

SELECT 
  'Functions' as object_type,
  COUNT(*) as count
FROM information_schema.routines 
WHERE routine_schema = 'public'

UNION ALL

SELECT 
  'Indexes' as object_type,
  COUNT(*) as count
FROM pg_indexes 
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'RLS Policies' as object_type,
  COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public';
