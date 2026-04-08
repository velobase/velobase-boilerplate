import { ArrowDownCircle, ArrowUpCircle, Snowflake, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export const OperationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "GRANT":
      return <ArrowDownCircle className="h-4 w-4 text-green-500" />
    case "CONSUME":
      return <ArrowUpCircle className="h-4 w-4 text-amber-500" />
    case "FREEZE":
      return <Snowflake className="h-4 w-4 text-blue-500" />
    case "UNFREEZE":
      return <Snowflake className="h-4 w-4 text-gray-400" />
    default:
      return <Clock className="h-4 w-4 text-gray-400" />
  }
}

export const OperationBadge = ({ type }: { type: string }) => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    GRANT: "default",
    CONSUME: "secondary",
    FREEZE: "outline",
    UNFREEZE: "outline",
  }
  return <Badge variant={variants[type] || "outline"}>{type}</Badge>
}

