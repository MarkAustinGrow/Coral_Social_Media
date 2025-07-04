# Phase 1 Implementation Guide
## Database Foundation for Multi-Tenant Coral Social Media

This guide provides step-by-step instructions for implementing Phase 1 of the multi-tenant migration.

## Overview

Phase 1 establishes the database foundation for multi-tenancy by:
- Adding `user_id` columns to existing tables
- Creating new multi-tenant tables
- Implementing Row Level Security (RLS) policies
- Adding performance indexes
- Creating utility functions and triggers

## Prerequisites

Before starting Phase 1, ensure you have:

✅ **Supabase Project Access**: Admin access to your Supabase project
✅ **Database Backup**: Complete backup of your current database
✅ **SQL Editor Access**: Access to Supabase SQL Editor or psql
✅ **Testing Environment**: Separate environment for testing (recommended)

## Implementation Steps

### Step 1: Backup Current Database

```bash
# Create a backup before migration
pg_dump -h your-supabase-host -U postgres -d postgres > coral_social_backup_$(date +%Y%m%d).sql
```

### Step 2: Execute Database Migration

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Create a new query

2. **Execute Migration Script**
   - Copy the contents of `database_migration_phase1.sql`
   - Paste into SQL Editor
   - Click "Run" to execute

3. **Monitor Execution**
   - Watch for any errors in the output
   - Ensure all statements complete successfully
   - Note: The script runs in a transaction, so it will rollback on any error

### Step 3: Validate Migration

1. **Run Validation Script**
   - Copy the contents of `test_database_migration.sql`
   - Execute in SQL Editor
   - Review all test results

2. **Expected Results**
   - All tables should have `user_id` columns
   - New tables created: `user_profiles`, `user_api_keys`, `api_usage_logs`, `user_settings`
   - 20+ performance indexes created
   - 12+ RLS policies implemented
   - 6 utility functions created
   - Triggers and views functioning

### Step 4: Verify RLS Policies

Test that Row Level Security is working correctly:

```sql
-- Test 1: Create test users
INSERT INTO user_profiles(user_id, email) 
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'user1@test.com'),
  ('550e8400-e29b-41d4-a716-446655440001', 'user2@test.com');

-- Test 2: Insert data for each user
INSERT INTO tweets(user_id, content, status) 
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'User 1 tweet', 'published'),
  ('550e8400-e29b-41d4-a716-446655440001', 'User 2 tweet', 'published');

-- Test 3: Verify isolation (should only see own data when authenticated)
-- This test requires setting auth.uid() context
```

### Step 5: Performance Testing

Run performance tests to ensure indexes are working:

```sql
-- Test query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM tweets 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' 
ORDER BY created_at DESC 
LIMIT 50;

-- Should show index usage: "Index Scan using idx_tweets_user_created"
```

## Migration Checklist

Use this checklist to track your progress:

### Database Schema
- [ ] `user_id` columns added to all existing tables
- [ ] `user_profiles` table created
- [ ] `user_api_keys` table created
- [ ] `api_usage_logs` table created
- [ ] `user_settings` table created

### Indexes
- [ ] User-specific indexes created for all tables
- [ ] Performance indexes for new tables
- [ ] Composite indexes for common query patterns

### Security
- [ ] RLS enabled on all tables
- [ ] RLS policies created for all tables
- [ ] Policies tested and working correctly

### Functions & Triggers
- [ ] `handle_new_user()` function created
- [ ] `increment_api_usage()` function created
- [ ] `reset_monthly_usage()` function created
- [ ] `check_usage_limit()` function created
- [ ] `get_user_api_key()` function created
- [ ] User creation trigger implemented
- [ ] Updated_at triggers implemented

### Views
- [ ] `user_dashboard_summary` view created
- [ ] `user_recent_activity` view created

### Testing
- [ ] All validation tests pass
- [ ] RLS policies prevent cross-user access
- [ ] Performance tests show index usage
- [ ] Utility functions work correctly

## Common Issues and Solutions

### Issue 1: Foreign Key Constraint Errors

**Problem**: Error adding `user_id` columns due to existing data
**Solution**: 
```sql
-- Allow NULL initially, then populate and make NOT NULL
ALTER TABLE tweets ADD COLUMN user_id UUID REFERENCES auth.users(id);
-- Populate with default user or migrate existing data
-- ALTER TABLE tweets ALTER COLUMN user_id SET NOT NULL;
```

### Issue 2: RLS Policies Too Restrictive

**Problem**: Cannot access data even as admin
**Solution**:
```sql
-- Add policy for service role
CREATE POLICY "service_role_access" ON tweets 
  FOR ALL TO service_role 
  USING (true);
```

### Issue 3: Index Creation Fails

**Problem**: Index creation times out or fails
**Solution**:
```sql
-- Create indexes concurrently to avoid locks
CREATE INDEX CONCURRENTLY idx_tweets_user_id ON tweets(user_id);
```

### Issue 4: Trigger Not Firing

**Problem**: User profiles not created automatically
**Solution**:
```sql
-- Verify trigger exists and is enabled
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_user_created';

-- Manually test trigger function
SELECT handle_new_user();
```

## Data Migration Considerations

### Existing Data

If you have existing data that needs to be associated with users:

```sql
-- Option 1: Assign all existing data to a default user
UPDATE tweets SET user_id = 'default-user-uuid' WHERE user_id IS NULL;
UPDATE blogs SET user_id = 'default-user-uuid' WHERE user_id IS NULL;
-- Repeat for all tables

-- Option 2: Create migration script based on existing patterns
-- This depends on your current data structure
```

### Production Deployment

For production deployment:

1. **Schedule Maintenance Window**
   - Plan for 30-60 minutes downtime
   - Notify users in advance

2. **Execute in Stages**
   ```sql
   -- Stage 1: Add columns (no downtime)
   ALTER TABLE tweets ADD COLUMN user_id UUID REFERENCES auth.users(id);
   
   -- Stage 2: Populate data (minimal impact)
   UPDATE tweets SET user_id = 'default-user' WHERE user_id IS NULL;
   
   -- Stage 3: Enable RLS (requires brief downtime)
   ALTER TABLE tweets ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "users_own_tweets" ON tweets FOR ALL USING (auth.uid() = user_id);
   ```

3. **Rollback Plan**
   ```sql
   -- Disable RLS if issues occur
   ALTER TABLE tweets DISABLE ROW LEVEL SECURITY;
   
   -- Remove user_id columns if needed
   ALTER TABLE tweets DROP COLUMN user_id;
   ```

## Performance Monitoring

After migration, monitor these metrics:

### Query Performance
```sql
-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE mean_time > 100 
ORDER BY mean_time DESC;
```

### Index Usage
```sql
-- Check index utilization
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### RLS Policy Performance
```sql
-- Monitor RLS overhead
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM tweets 
WHERE user_id = auth.uid() 
LIMIT 10;
```

## Security Validation

### Test RLS Isolation

Create a comprehensive test to ensure users cannot access each other's data:

```sql
-- Test script for RLS validation
DO $$
DECLARE
  user1_id UUID := gen_random_uuid();
  user2_id UUID := gen_random_uuid();
BEGIN
  -- Create test users
  INSERT INTO user_profiles(user_id, email) VALUES 
    (user1_id, 'test1@example.com'),
    (user2_id, 'test2@example.com');
  
  -- Insert test data
  INSERT INTO tweets(user_id, content) VALUES 
    (user1_id, 'User 1 tweet'),
    (user2_id, 'User 2 tweet');
  
  -- Test isolation (this would need to be done with actual auth context)
  -- In practice, test this through your application with real user sessions
  
  RAISE NOTICE 'RLS test data created. Test isolation through application.';
END $$;
```

## Next Steps

Once Phase 1 is complete and validated:

1. **Document Results**
   - Record any issues encountered
   - Note performance baseline metrics
   - Update team on completion

2. **Prepare for Phase 2**
   - Set up development environment for authentication
   - Review Supabase Auth documentation
   - Plan authentication UI implementation

3. **Monitor Production**
   - Watch for any performance issues
   - Monitor error logs
   - Ensure RLS policies are working correctly

## Success Criteria

Phase 1 is complete when:

✅ All database tables have `user_id` columns
✅ RLS policies prevent cross-user data access
✅ Performance indexes are created and being used
✅ Utility functions work correctly
✅ Triggers automatically provision new users
✅ Views provide useful dashboard data
✅ All validation tests pass
✅ No performance degradation observed

## Support and Troubleshooting

If you encounter issues:

1. **Check Supabase Logs**
   - Review database logs in Supabase dashboard
   - Look for constraint violations or permission errors

2. **Validate Schema**
   - Ensure all tables and columns exist
   - Verify foreign key relationships

3. **Test RLS Policies**
   - Use Supabase Auth to create test users
   - Verify data isolation through the application

4. **Performance Issues**
   - Check if indexes are being used
   - Monitor query execution times
   - Consider adding additional indexes if needed

Remember: This is the foundation for all subsequent phases. Take time to ensure everything is working correctly before proceeding to Phase 2.
