import { Loader2, AlertCircle, Database } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SupabaseError } from "@/lib/supabase"

interface DataStateProps<T> {
  isLoading: boolean
  error: SupabaseError | null
  data: T | null
  loadingComponent?: React.ReactNode
  errorComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
  children: (data: T) => React.ReactNode
  onRetry?: () => void
}

export function DataState<T>({
  isLoading,
  error,
  data,
  loadingComponent,
  errorComponent,
  emptyComponent,
  children,
  onRetry,
}: DataStateProps<T>) {
  // Loading state
  if (isLoading) {
    if (loadingComponent) return <>{loadingComponent}</>

    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          <p className="mt-4 text-center text-sm text-muted-foreground">Loading data...</p>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    if (errorComponent) return <>{errorComponent}</>

    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading data</AlertTitle>
        <AlertDescription className="mt-2">
          <p>{error.message}</p>
          {error.details && <p className="mt-1 text-xs">{error.details}</p>}
          {error.hint && <p className="mt-1 text-xs">Hint: {error.hint}</p>}
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
              Try again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  // Empty state
  if (!data || (Array.isArray(data) && data.length === 0)) {
    if (emptyComponent) return <>{emptyComponent}</>

    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Database className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-center text-sm text-muted-foreground">No data available</p>
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
              Refresh
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // Data state
  return <>{children(data)}</>
}
