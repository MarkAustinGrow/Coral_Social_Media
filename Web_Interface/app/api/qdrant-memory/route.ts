import { type NextRequest, NextResponse } from "next/server"
import { loadEnvFromRoot, getRootEnv } from "@/lib/env-loader"

// Sample data for when Qdrant is not available
const SAMPLE_MEMORIES = [
  {
    point_id: "sample-1",
    tweet_text: "Just discovered a new AI tool that helps with content creation. It's amazing how far we've come with generative models! #AI #ContentCreation",
    analysis: "Positive sentiment about AI tools for content creation. Shows enthusiasm for technological advancements.",
    topics: ["artificial_intelligence", "content_creation", "technology"],
    sentiment: "positive",
    persona_name: "Tech Enthusiast",
    date: new Date().toISOString(),
    confidence_score: 0.95,
    related_entities: ["AI", "Content Creation", "Generative Models"],
    metadata: {
      author: "@tech_user",
      engagement_score: 87,
      retweet_count: 42,
      like_count: 156,
      source_url: "https://twitter.com/tech_user/status/1234567890",
    },
  },
  {
    point_id: "sample-2",
    tweet_text: "Market volatility continues as investors react to the latest economic indicators. Caution advised for those in growth sectors. #Finance #Markets",
    analysis: "Neutral assessment of market conditions with a cautionary tone for specific sectors.",
    topics: ["finance", "market_trends", "investing"],
    sentiment: "neutral",
    persona_name: "Finance Expert",
    date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    confidence_score: 0.88,
    related_entities: ["Market Volatility", "Economic Indicators", "Growth Sectors"],
    metadata: {
      author: "@finance_analyst",
      engagement_score: 65,
      retweet_count: 28,
      like_count: 93,
      source_url: "https://twitter.com/finance_analyst/status/1234567891",
    },
  },
  {
    point_id: "sample-3",
    tweet_text: "Disappointed with the new policy changes. This will negatively impact small businesses who are already struggling. #SmallBusiness #Policy",
    analysis: "Negative reaction to policy changes, expressing concern for small business impact.",
    topics: ["small_business", "policy", "economy"],
    sentiment: "negative",
    persona_name: "Business Advocate",
    date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    confidence_score: 0.92,
    related_entities: ["Policy Changes", "Small Businesses", "Economic Impact"],
    metadata: {
      author: "@business_voice",
      engagement_score: 112,
      retweet_count: 76,
      like_count: 204,
      source_url: "https://twitter.com/business_voice/status/1234567892",
    },
  }
];

// Load environment variables
const env = loadEnvFromRoot()

// Get Qdrant configuration
const QDRANT_URL = getRootEnv("QDRANT_URL") || "http://localhost:6333"
const QDRANT_API_KEY = getRootEnv("QDRANT_API_KEY") || ""
// Use the tweet_insights collection
const COLLECTION_NAME = "tweet_insights"

export async function GET(req: NextRequest) {
  try {
    // First, check if the collection exists
    try {
      const collectionUrl = `${QDRANT_URL}/collections/${COLLECTION_NAME}`
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (QDRANT_API_KEY) {
        headers['Api-Key'] = QDRANT_API_KEY
      }
      
      const collectionResponse = await fetch(collectionUrl, {
        method: 'GET',
        headers,
      })
      
      if (!collectionResponse.ok) {
      console.error(`Collection ${COLLECTION_NAME} not found or not accessible`)
      // Return sample data instead of empty results
      return NextResponse.json({
        success: true,
        result: SAMPLE_MEMORIES,
        total: SAMPLE_MEMORIES.length,
        query_time_ms: 0,
        next_page_offset: null,
        message: `Collection ${COLLECTION_NAME} not found or not accessible. Showing sample data.`
      })
      }
    } catch (error) {
      console.error(`Error checking collection: ${error}`)
      // Return sample data instead of empty results
      return NextResponse.json({
        success: true,
        result: SAMPLE_MEMORIES,
        total: SAMPLE_MEMORIES.length,
        query_time_ms: 0,
        next_page_offset: null,
        message: "Error connecting to Qdrant server. Showing sample data."
      })
    }
    const query = req.nextUrl.searchParams.get("query") || ""
    const filtersParam = req.nextUrl.searchParams.get("filters")
    const limit = Number.parseInt(req.nextUrl.searchParams.get("limit") || "20")
    const offset = Number.parseInt(req.nextUrl.searchParams.get("offset") || "0")
    
    // Parse filters if provided
    const filters = filtersParam ? JSON.parse(filtersParam) : {}
    
    // Build filter conditions - adapt to Max-Memory field names
    const filterConditions = []
    
    if (filters.topics && filters.topics.length > 0) {
      // Max-Memory uses "tags" instead of "topics"
      filterConditions.push({
        key: "tags",
        match: {
          any: filters.topics.map((topic: string) => ({ value: topic })),
        },
      })
    }
    
    if (filters.sentiment) {
      filterConditions.push({
        key: "sentiment",
        match: { value: filters.sentiment },
      })
    }
    
    if (filters.persona) {
      // Max-Memory uses "character_version" instead of "persona_name"
      filterConditions.push({
        key: "character_version",
        match: { value: filters.persona },
      })
    }
    
    if (filters.dateRange?.from && filters.dateRange?.to) {
      // Max-Memory uses "timestamp" instead of "date"
      filterConditions.push({
        key: "timestamp",
        range: {
          gte: new Date(filters.dateRange.from).toISOString(),
          lte: new Date(filters.dateRange.to).toISOString(),
        },
      })
    }
    
    // Construct the filter object
    const filter = filterConditions.length > 0
      ? { must: filterConditions }
      : undefined
    
    const startTime = Date.now()
    
    // Use scroll API instead of search API for listing all memories
    // This matches the approach used in the Max-Memory implementation
    // Set a high limit to get all memories at once (no pagination)
    const scrollBody: any = {
      limit: 1000, // High limit to get all memories
      with_payload: {
        include: ["content", "tweet_text", "tags", "topics", "sentiment", "persona_name", "character_version", "timestamp", "date", "persona_alignment_score"]
      },
      offset: null
    }
    
    console.log(`Connecting to Qdrant at ${QDRANT_URL}, collection: ${COLLECTION_NAME}`)
    console.log(`Using scroll API to get memories`)
    
    // Call Qdrant API - use scroll API which doesn't require a vector
    const scrollUrl = `${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    if (QDRANT_API_KEY) {
      headers['Api-Key'] = QDRANT_API_KEY
    }
    
    const response = await fetch(scrollUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(scrollBody),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Qdrant API error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        { success: false, error: `Qdrant API error: ${response.status}` },
        { status: response.status }
      )
    }
    
    const searchResults = await response.json()
    
    // Log the response for debugging
    console.log(`Qdrant response received, status: ${response.status}`)
    console.log(`Search results:`, JSON.stringify(searchResults).substring(0, 200) + '...')
    
    // With scroll API, results are in the result.points array
    let points = searchResults.result?.points || []
    
    // Apply filter manually if provided (similar to Max-Memory implementation)
    if (filter) {
      points = points.filter((point: any) => {
        // Simple implementation of filter matching
        // This could be expanded to match the full filter logic in Max-Memory
        for (const condition of filter.must || []) {
          const key = condition.key
          if (!point.payload[key]) return false
          
          if (condition.match) {
            // Handle match condition
            if (Array.isArray(point.payload[key])) {
              // For arrays like topics, check if value is in array
              if (!point.payload[key].includes(condition.match.value)) return false
            } else {
              // Direct comparison
              if (point.payload[key] !== condition.match.value) return false
            }
          } else if (condition.range) {
            // Handle range condition
            const value = point.payload[key]
            if (condition.range.gte !== undefined && value < condition.range.gte) return false
            if (condition.range.lte !== undefined && value > condition.range.lte) return false
          }
        }
        return true
      })
    }
    
    // Filter results by query if provided (client-side text search)
    if (query && query.trim() !== "") {
      const lowerQuery = query.toLowerCase()
      points = points.filter((point: any) => {
        // Check in content field (Max-Memory) or tweet_text field (our format)
        const content = ((point.payload && point.payload.content) || "").toLowerCase()
        const tweetText = ((point.payload && point.payload.tweet_text) || "").toLowerCase()
        const analysis = ((point.payload && point.payload.analysis_result) || 
                         (point.payload && point.payload.analysis) || "").toLowerCase()
        return content.includes(lowerQuery) || tweetText.includes(lowerQuery) || analysis.includes(lowerQuery)
      })
    }
    
    const queryTime = Date.now() - startTime
    
    // Format results with safer property access - only include fields needed for table view
    // Map fields from Max-Memory format to our expected format
    const formattedResults = points.map((result: any) => {
      const payload = result.payload || {};
      
      return {
        point_id: result.id,
        // Max-Memory uses "content" for the main text
        tweet_text: payload.content || payload.tweet_text || "No content available",
        // Max-Memory uses "tags" instead of "topics"
        topics: Array.isArray(payload.tags) ? payload.tags : 
                (Array.isArray(payload.topics) ? payload.topics : []),
        // Extract sentiment or default to neutral
        sentiment: payload.sentiment || "neutral",
        // Use character_version as persona_name if available
        persona_name: payload.persona_name || payload.character_version || "Unknown",
        // Use timestamp as date
        date: payload.timestamp || payload.date || new Date().toISOString(),
        // Use persona_alignment_score as confidence_score if available
        confidence_score: payload.persona_alignment_score || result.score || 1.0,
      };
    });
    
    // If no results were found, return sample data
    if (formattedResults.length === 0) {
      return NextResponse.json({
        success: true,
        result: SAMPLE_MEMORIES,
        total: SAMPLE_MEMORIES.length,
        query_time_ms: queryTime,
        next_page_offset: null,
        message: "No matching memories found in Qdrant. Showing sample data."
      });
    }
    
    return NextResponse.json({
      success: true,
      result: formattedResults,
      total: formattedResults.length,
      query_time_ms: queryTime,
      // Scroll API provides next_page_offset directly
      next_page_offset: searchResults.result?.next_page_offset || null
    })
  } catch (error) {
    console.error("Error searching Qdrant memories:", error)
    // Return sample data instead of error
    return NextResponse.json({
      success: true,
      result: SAMPLE_MEMORIES,
      total: SAMPLE_MEMORIES.length,
      query_time_ms: 0,
      next_page_offset: null,
      message: "Error searching memories. Showing sample data."
    })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { point_id } = await req.json()
    
    if (!point_id) {
      return NextResponse.json(
        { success: false, error: "Point ID is required" },
        { status: 400 }
      )
    }
    
    // Call Qdrant API to delete the point
    const deleteUrl = `${QDRANT_URL}/collections/${COLLECTION_NAME}/points/delete`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    if (QDRANT_API_KEY) {
      headers['Api-Key'] = QDRANT_API_KEY
    }
    
    const response = await fetch(deleteUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        points: [point_id],
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Qdrant API error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        { success: false, error: `Failed to delete memory: ${errorText}` },
        { status: response.status }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: `Memory ${point_id} deleted successfully`,
    })
  } catch (error) {
    console.error("Error deleting Qdrant memory:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete memory" },
      { status: 500 }
    )
  }
}
