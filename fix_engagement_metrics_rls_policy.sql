-- Fix RLS policy for engagement_metrics table to work with authenticated API calls
-- This replaces the problematic policy that was blocking API access

-- First, drop the existing policy that was causing issues
DROP POLICY IF EXISTS "users_own_engagement_metrics" ON public.engagement_metrics;

-- Create a new policy that works with both authenticated users and service role
CREATE POLICY "users_own_engagement_metrics_fixed" ON public.engagement_metrics
FOR ALL
TO authenticated, anon
USING (
  -- Allow access if the user_id matches the authenticated user's ID
  -- OR if this is a service role request (for system operations)
  auth.uid() = user_id 
  OR 
  auth.jwt() ->> 'role' = 'service_role'
);

-- Ensure RLS is enabled on the table
ALTER TABLE public.engagement_metrics ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagement_metrics TO anon;

-- Verify the policy is working by testing a query
-- This should return data for the authenticated user
SELECT 
  id, 
  topic, 
  user_id,
  engagement_score
FROM public.engagement_metrics 
WHERE user_id = auth.uid()
LIMIT 5;
