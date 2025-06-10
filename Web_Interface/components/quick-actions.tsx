import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText, MessageSquare, Twitter, Zap } from "lucide-react"

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      <Button variant="outline" size="sm" asChild>
        <Link href="/blogs">
          <FileText className="mr-2 h-4 w-4" />
          Blogs
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href="/tweets">
          <MessageSquare className="mr-2 h-4 w-4" />
          Tweets
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href="/accounts">
          <Twitter className="mr-2 h-4 w-4" />
          Accounts
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href="/logs">
          <Zap className="mr-2 h-4 w-4" />
          Agents
        </Link>
      </Button>
    </div>
  )
}
