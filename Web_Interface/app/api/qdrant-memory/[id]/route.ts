import { type NextRequest, NextResponse } from "next/server"
import { loadEnvFromRoot, getRootEnv } from "@/lib/env-loader"

// Load environment variables
const env = loadEnvFromRoot()

// Get Qdrant configuration
const QDRANT_URL = getRootEnv("QDRANT_URL") || "http://localhost:6333"
const QDRANT_API_KEY = getRootEnv("QDRANT_API_KEY") || ""
const COLLECTION_NAME = "macrobot_memory"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const pointId = params.id
  
  if (!pointId) {
    return NextResponse.json(
      { success: false, error: "Point ID is required" },
      { status: 400 }
    )
  }
  
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
        return NextResponse.json({
          success: false,
          error: `Collection ${COLLECTION_NAME} not found or not accessible.`
        }, { status: 404 })
      }
    } catch (error) {
      console.error(`Error checking collection: ${error}`)
      return NextResponse.json({
        success: false,
        error: "Error connecting to Qdrant server."
      }, { status: 500 })
    }
    
    // Call Qdrant API to get the specific point
    const getPointUrl = `${QDRANT_URL}/collections/${COLLECTION_NAME}/points/${pointId}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    if (QDRANT_API_KEY) {
      headers['Api-Key'] = QDRANT_API_KEY
    }
    
    console.log(`Fetching point ${pointId} from Qdrant at ${QDRANT_URL}`)
    
    const response = await fetch(getPointUrl, {
      method: 'GET',
      headers,
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Qdrant API error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        { success: false, error: `Memory not found: ${errorText}` },
        { status: response.status }
      )
    }
    
    const pointData = await response.json()
    
    // Format the result with safer property access
    // Map fields from Max-Memory format to our expected format
    const result = pointData.result
    if (!result) {
      return NextResponse.json(
        { success: false, error: "Memory not found" },
        { status: 404 }
      )
    }
    
    const payload = result.payload || {};
    
    const formattedMemory = {
      point_id: result.id,
      // Max-Memory uses "content" for the main text
      tweet_text: payload.content || payload.tweet_text || "No content available",
      // Use analysis field or generate a summary
      analysis: payload.analysis_result || payload.analysis || 
               (payload.content ? `Memory from source: ${payload.source || "unknown"}` : "No analysis available"),
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
      // Extract related entities or use matched_aspects
      related_entities: Array.isArray(payload.related_entities) ? payload.related_entities : 
                       (Array.isArray(payload.matched_aspects) ? payload.matched_aspects : []),
      // Build metadata from available fields
      metadata: {
        author: payload.author || payload.source || "@unknown",
        engagement_score: typeof payload.engagement_score === 'number' ? payload.engagement_score : 0,
        retweet_count: typeof payload.retweet_count === 'number' ? payload.retweet_count : 0,
        like_count: typeof payload.like_count === 'number' ? payload.like_count : 0,
        source_url: payload.source_url || "",
        // Add memory type if available
        type: payload.type || "unknown",
        // Add alignment explanation if available
        alignment_explanation: payload.alignment_explanation || ""
      },
    };
    
    return NextResponse.json({
      success: true,
      memory: formattedMemory
    })
  } catch (error) {
    console.error("Error fetching memory:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch memory details" },
      { status: 500 }
    )
  }
}
