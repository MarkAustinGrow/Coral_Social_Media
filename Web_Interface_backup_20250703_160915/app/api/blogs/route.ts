import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseClient, handleSupabaseError } from '@/lib/supabase'
import { BlogPost, BlogCritique, BlogWithCritique } from '@/hooks/use-blog-data'

// Helper function to check if a table exists
async function tableExists(supabase: any, tableName: string): Promise<boolean> {
  try {
    console.log(`Checking if table ${tableName} exists...`)
    
    // Query the information_schema to check if the table exists
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', tableName)
      .eq('table_schema', 'public')
    
    if (error) {
      console.error(`Error checking if table ${tableName} exists:`, error)
      return false
    }
    
    const exists = data && data.length > 0
    console.log(`Table ${tableName} exists: ${exists}`)
    return exists
  } catch (error) {
    console.error(`Error in tableExists for ${tableName}:`, error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const withCritiques = searchParams.get('with_critiques') === 'true'
    
    console.log('Fetching blogs with params:', { status, limit, withCritiques })
    
    // Get Supabase client
    console.log('Getting Supabase client for blogs API')
    const supabase = await getSupabaseClient()
    
    if (!supabase) {
      console.error('Supabase client is not available')
      
      // Try to create a client directly with environment variables
      console.log('Attempting to create Supabase client directly')
      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_KEY
      
      console.log('Direct env vars available:', {
        urlAvailable: !!supabaseUrl,
        keyAvailable: !!supabaseKey
      })
      
      if (supabaseUrl && supabaseKey) {
        try {
          console.log('Creating Supabase client directly with URL:', supabaseUrl.substring(0, 15) + '...')
          const directClient = createClient(supabaseUrl, supabaseKey)
          console.log('Direct Supabase client created successfully')
          
          // Continue with the direct client
          return await handleBlogRequests(directClient, status, limit, withCritiques)
        } catch (directError) {
          console.error('Failed to create direct Supabase client:', directError)
        }
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Supabase client is not available. Please check your configuration.' 
        },
        { status: 500 }
      )
    }
    
    // If we have a client, continue with the request
    return await handleBlogRequests(supabase, status, limit, withCritiques)
  } catch (error: any) {
    console.error('Error in blogs API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch blogs',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Handle blog requests with a valid Supabase client
 */
async function handleBlogRequests(
  supabase: any, 
  status: string | null, 
  limit: number,
  withCritiques: boolean = false
) {
  try {
    
    // Check if the required tables exist and create them if they don't
    try {
      console.log('Checking and creating tables if needed...')
      
      // Check if blog_posts table exists by trying to select from it
      console.log('Checking if blog_posts table exists')
      const { error: blogPostsCheckError } = await supabase
        .from('blog_posts')
        .select('id')
        .limit(1)
      
      // If the table doesn't exist, create it
      if (blogPostsCheckError && blogPostsCheckError.code === '42P01') {
        console.log('blog_posts table does not exist, creating it...')
        
        // Create the blog_posts table
        const { error: createBlogPostsError } = await supabase.rpc('create_blog_posts_table')
        
        if (createBlogPostsError) {
          console.error('Error creating blog_posts table using RPC:', createBlogPostsError)
          
          // Try direct SQL if RPC fails
          const { error: sqlCreateError } = await supabase.query(`
            CREATE TABLE IF NOT EXISTS blog_posts (
              id SERIAL PRIMARY KEY,
              title TEXT NOT NULL,
              content TEXT NOT NULL,
              word_count INTEGER DEFAULT 0,
              status TEXT DEFAULT 'draft',
              created_at TIMESTAMPTZ DEFAULT NOW(),
              published_at TIMESTAMPTZ,
              updated_at TIMESTAMPTZ DEFAULT NOW(),
              review_status TEXT DEFAULT 'pending_fact_check',
              fact_checked_at TIMESTAMP
            )
          `)
          
          if (sqlCreateError) {
            console.error('Error creating blog_posts table with SQL:', sqlCreateError)
            return NextResponse.json(
              { 
                success: false, 
                error: 'Failed to create blog_posts table',
                details: handleSupabaseError(sqlCreateError)
              },
              { status: 500 }
            )
          }
          
          console.log('Successfully created blog_posts table with SQL')
        } else {
          console.log('Successfully created blog_posts table with RPC')
        }
      } else if (blogPostsCheckError) {
        console.error('Error checking blog_posts table:', blogPostsCheckError)
        return NextResponse.json(
          { 
            success: false, 
            error: 'Error checking blog_posts table',
            details: handleSupabaseError(blogPostsCheckError)
          },
          { status: 500 }
        )
      } else {
        console.log('blog_posts table exists')
      }
      
      // Check if blog_critique table exists
      console.log('Checking if blog_critique table exists')
      const { error: blogCritiqueCheckError } = await supabase
        .from('blog_critique')
        .select('id')
        .limit(1)
      
      // If the table doesn't exist, create it
      if (blogCritiqueCheckError && blogCritiqueCheckError.code === '42P01') {
        console.log('blog_critique table does not exist, creating it...')
        
        // Create the blog_critique table
        const { error: createBlogCritiqueError } = await supabase.rpc('create_blog_critique_table')
        
        if (createBlogCritiqueError) {
          console.error('Error creating blog_critique table using RPC:', createBlogCritiqueError)
          
          // Try direct SQL if RPC fails
          const { error: sqlCreateError } = await supabase.query(`
            CREATE TABLE IF NOT EXISTS blog_critique (
              id SERIAL PRIMARY KEY,
              blog_id INTEGER REFERENCES blog_posts(id),
              critique TEXT,
              summary TEXT,
              decision TEXT,
              created_at TIMESTAMP DEFAULT NOW()
            )
          `)
          
          if (sqlCreateError) {
            console.error('Error creating blog_critique table with SQL:', sqlCreateError)
            console.warn('Will proceed without critiques')
          } else {
            console.log('Successfully created blog_critique table with SQL')
          }
        } else {
          console.log('Successfully created blog_critique table with RPC')
        }
      } else if (blogCritiqueCheckError) {
        console.warn('Error checking blog_critique table:', blogCritiqueCheckError)
        console.warn('Will proceed without critiques')
      } else {
        console.log('blog_critique table exists')
      }
    } catch (error: any) {
      console.error('Error checking tables:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to check if required tables exist',
          details: error.message
        },
        { status: 500 }
      )
    }
    
    // Start query for blog posts
    try {
      console.log('Starting query for blog posts')
      
      // Check if we're looking for blogs with critiques
      if (withCritiques) {
        console.log('Fetching blogs with critiques')
        
        // Use a join query to get blogs that have critiques
        const { data: blogIds, error: joinError } = await supabase
          .from('blog_critique')
          .select('blog_id')
          .order('created_at', { ascending: false })
        
        if (joinError) {
          console.error('Error fetching blog IDs with critiques:', joinError)
          return NextResponse.json(
            { 
              success: false, 
              error: 'Failed to fetch blogs with critiques',
              details: handleSupabaseError(joinError) 
            },
            { status: 500 }
          )
        }
        
        if (!blogIds || blogIds.length === 0) {
          console.log('No blogs with critiques found')
          return NextResponse.json({
            success: true,
            data: []
          })
        }
        
        // Extract unique blog IDs
        const uniqueBlogIds = [...new Set(blogIds.map((item: { blog_id: number }) => item.blog_id))]
        console.log(`Found ${uniqueBlogIds.length} unique blogs with critiques`)
        
        // Fetch the blog posts with these IDs
        let query = supabase.from('blog_posts').select('*')
          .in('id', uniqueBlogIds)
          .order('created_at', { ascending: false })
          .limit(limit)
        
        // Execute query
        const { data: blogPosts, error: blogError } = await query
        
        if (blogError) {
          console.error('Error fetching blog posts with critiques:', blogError)
          return NextResponse.json(
            { 
              success: false, 
              error: 'Failed to fetch blog posts with critiques',
              details: handleSupabaseError(blogError) 
            },
            { status: 500 }
          )
        }
        
        if (!blogPosts || blogPosts.length === 0) {
          console.log('No matching blog posts found for the critique IDs')
          return NextResponse.json({
            success: true,
            data: []
          })
        }
        
        console.log(`Found ${blogPosts.length} blog posts with critiques`)
        
        // For each blog post, fetch its critique
        console.log('Fetching critiques for blog posts')
        const blogsWithCritiques = await Promise.all(
          (blogPosts as BlogPost[]).map(async (blog) => {
            try {
              // Fetch critique for this blog
              console.log(`Fetching critique for blog ${blog.id}`)
              const { data: critiques, error: critiqueError } = await supabase
                .from('blog_critique')
                .select('*')
                .eq('blog_id', blog.id)
                .order('created_at', { ascending: false })
                .limit(1)
              
              if (critiqueError) {
                console.error(`Error fetching critique for blog ${blog.id}:`, critiqueError)
                return {
                  ...blog,
                  critique: null
                }
              }
              
              // Return blog with its critique
              return {
                ...blog,
                critique: critiques && critiques.length > 0 ? critiques[0] : null
              }
            } catch (error: any) {
              console.error(`Error processing blog ${blog.id}:`, error)
              return {
                ...blog,
                critique: null
              }
            }
          })
        )
        
        // Return successful response
        console.log('Successfully fetched blogs with critiques')
        return NextResponse.json({
          success: true,
          data: blogsWithCritiques
        })
      }
      
      // Standard query for blog posts by status
      let query = supabase.from('blog_posts').select('*')
      
      // Apply status filter if provided
      if (status) {
        console.log(`Filtering by status: ${status}`)
        query = query.eq('status', status)
      }
      
      // Apply limit
      query = query.limit(limit)
      
      // Order by created_at in descending order (newest first)
      query = query.order('created_at', { ascending: false })
      
      console.log('Executing blog posts query')
      // Execute query
      const { data: blogPosts, error: blogError } = await query
    
      if (blogError) {
        console.error('Error fetching blog posts:', blogError)
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to fetch blog posts',
            details: handleSupabaseError(blogError) 
          },
          { status: 500 }
        )
      }
    
      if (!blogPosts || blogPosts.length === 0) {
        console.log('No blog posts found')
        return NextResponse.json({
          success: true,
          data: []
        })
      }
      
      console.log(`Found ${blogPosts.length} blog posts`)
      
      // Log the first blog post to see its structure
      if (blogPosts.length > 0) {
        console.log('First blog post structure:', JSON.stringify(blogPosts[0], null, 2))
      }
      
      // For each blog post, fetch its critique if available
      console.log('Fetching critiques for blog posts')
      const blogsWithCritiques = await Promise.all(
        (blogPosts as BlogPost[]).map(async (blog) => {
          try {
            // Fetch critique for this blog
            console.log(`Fetching critique for blog ${blog.id}`)
            const { data: critiques, error: critiqueError } = await supabase
              .from('blog_critique')
              .select('*')
              .eq('blog_id', blog.id)
              .order('created_at', { ascending: false })
              .limit(1)
            
            if (critiqueError) {
              console.error(`Error fetching critique for blog ${blog.id}:`, critiqueError)
              return {
                ...blog,
                critique: null
              }
            }
            
            // Return blog with its critique
            return {
              ...blog,
              critique: critiques && critiques.length > 0 ? critiques[0] : null
            }
          } catch (error: any) {
            console.error(`Error processing blog ${blog.id}:`, error)
            return {
              ...blog,
              critique: null
            }
          }
        })
      )
    
      // Return successful response
      console.log('Successfully fetched blogs with critiques')
      return NextResponse.json({
        success: true,
        data: blogsWithCritiques
      })
    } catch (queryError: any) {
      console.error('Error executing queries:', queryError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error executing database queries',
          details: queryError.message
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in blogs API:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch blogs',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
