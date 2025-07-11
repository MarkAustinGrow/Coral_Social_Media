-- Query to return all blog posts with full details
SELECT 
    id,
    title,
    content,
    word_count,
    status,
    created_at,
    published_at,
    updated_at,
    review_status,
    fact_checked_at,
    user_id
FROM blog_posts
ORDER BY created_at DESC;

-- Query to return only blog posts for the specific user
SELECT 
    id,
    title,
    content,
    word_count,
    status,
    created_at,
    published_at,
    updated_at,
    review_status,
    fact_checked_at,
    user_id
FROM blog_posts 
WHERE user_id = '3b55275a-d666-4724-ae39-26a58fda3aff'
ORDER BY created_at DESC;

-- Query to check if user_id column exists and its data type
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'blog_posts' 
AND table_schema = 'public'
ORDER BY ordinal_position;
