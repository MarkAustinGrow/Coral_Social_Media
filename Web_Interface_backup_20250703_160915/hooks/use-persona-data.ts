"use client"

import { useState, useEffect } from 'react'
import { DataState, getSupabaseClient, handleSupabaseError } from '@/lib/supabase'
import { useSupabaseData } from './use-supabase-data'

// Define the Persona type based on the Supabase table structure
export interface Persona {
  id?: number
  name: string
  description: string
  tone: number
  humor: number
  enthusiasm: number
  assertiveness: number
  created_at?: string
  updated_at?: string
}

// Default persona values
export const defaultPersona: Persona = {
  name: "Tech Thought Leader",
  description: "A knowledgeable and insightful tech industry expert who shares valuable perspectives on emerging technologies and industry trends.",
  tone: 70, // 0-100: formal to casual
  humor: 40, // 0-100: serious to humorous
  enthusiasm: 65, // 0-100: reserved to enthusiastic
  assertiveness: 75, // 0-100: gentle to assertive
}

// Hook to fetch the current persona
export function usePersona() {
  // Use the generic Supabase data hook to fetch personas
  const { data, isLoading, error } = useSupabaseData<Persona>(
    'personas',
    {
      limit: 1,
      orderBy: { column: 'created_at', ascending: false }
    }
  )

  // Return the first persona or the default if none exists
  return {
    persona: data && data.length > 0 ? data[0] : defaultPersona,
    isLoading,
    error
  }
}

// Hook to save or update a persona
export function useSavePersona() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<{ message: string } | null>(null)
  const [success, setSuccess] = useState(false)

  // Function to save or update a persona
  const savePersona = async (persona: Persona) => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = await getSupabaseClient()
      
      if (!supabase) {
        throw new Error('Supabase client is not available')
      }

      // Check if we have any personas in the table
      const { data: existingPersonas, error: fetchError } = await supabase
        .from('personas')
        .select('id')
        .limit(1)

      if (fetchError) {
        throw fetchError
      }

      let result

      if (persona.id) {
        // Update existing persona
        result = await supabase
          .from('personas')
          .update({
            name: persona.name,
            description: persona.description,
            tone: persona.tone,
            humor: persona.humor,
            enthusiasm: persona.enthusiasm,
            assertiveness: persona.assertiveness,
            updated_at: new Date().toISOString()
          })
          .eq('id', persona.id)
      } else if (existingPersonas && existingPersonas.length > 0) {
        // Update the first persona if no ID is provided but personas exist
        result = await supabase
          .from('personas')
          .update({
            name: persona.name,
            description: persona.description,
            tone: persona.tone,
            humor: persona.humor,
            enthusiasm: persona.enthusiasm,
            assertiveness: persona.assertiveness,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPersonas[0].id)
      } else {
        // Insert new persona if none exist
        result = await supabase
          .from('personas')
          .insert({
            name: persona.name,
            description: persona.description,
            tone: persona.tone,
            humor: persona.humor,
            enthusiasm: persona.enthusiasm,
            assertiveness: persona.assertiveness
          })
      }

      if (result.error) {
        throw result.error
      }

      setSuccess(true)
    } catch (err: any) {
      setError(handleSupabaseError(err))
    } finally {
      setIsLoading(false)
    }
  }

  return { savePersona, isLoading, error, success }
}
