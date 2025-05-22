import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Filter } from "lucide-react"

const arcs = [
  {
    id: "ARC-0001",
    title: "Algorand Wallet Transaction Signing API",
    status: "Final",
    date: "2021-09-15",
    category: "Interface",
  },
  // Add more ARCs...
]

export default function ARCsPage() {
  return (
    <main className="min-h-screen animated-gradient pt-20">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Algorand Request for Comments (ARCs)</h1>

        <div className="glass-effect rounded-lg p-4 mb-8">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input placeholder="Search ARCs..." className="pl-10 bg-transparent border-white/20 text-white" />
            </div>
            <Button variant="outline" className=" border-white/20">
              <Filter className="mr-2 h-4 w-4" /> Filter
            </Button>
          </div>
        </div>

        <div className="glass-effect rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-white">ARC</TableHead>
                <TableHead className="text-white">Title</TableHead>
                <TableHead className="text-white">Status</TableHead>
                <TableHead className="text-white">Category</TableHead>
                <TableHead className="text-white">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arcs.map((arc) => (
                <TableRow key={arc.id} className="hover:bg-white/5">
                  <TableCell className="font-medium text-white">{arc.id}</TableCell>
                  <TableCell className="text-gray-300">{arc.title}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        arc.status === "Final" ? "border-green-500 text-green-500" : "border-yellow-500 text-yellow-500"
                      }
                    >
                      {arc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300">{arc.category}</TableCell>
                  <TableCell className="text-gray-300">{arc.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  )
}

