import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, GitFork, Star } from "lucide-react"

const projects = [
  {
    id: 1,
    name: "Algorand SDK",
    description: "Official Algorand SDK for multiple programming languages",
    stars: 1200,
    forks: 340,
    language: "TypeScript",
    tags: ["SDK", "Development"],
  },
  // Add more projects...
]

export default function OpenSourcePage() {
  return (
    <main className="min-h-screen animated-gradient pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Open Source Projects</h1>
          <Button className="bg-white text-black hover:bg-white/90">
            <Plus className="mr-2 h-4 w-4" /> Add Project
          </Button>
        </div>

        <div className="glass-effect rounded-lg p-4 mb-8">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input placeholder="Search projects..." className="pl-10 bg-transparent border-white/20 text-white" />
            </div>
            <Select>
              <SelectTrigger className="w-[180px] bg-transparent text-white border-white/20">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-[180px] bg-transparent text-white border-white/20">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stars">Most Stars</SelectItem>
                <SelectItem value="forks">Most Forks</SelectItem>
                <SelectItem value="recent">Recently Added</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="glass-effect p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{project.name}</h3>
                  <p className="text-gray-400 mb-4">{project.description}</p>
                  <div className="flex gap-3">
                    <span className="text-sm text-gray-400">{project.language}</span>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Star className="h-4 w-4" />
                      <span>{project.stars}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <GitFork className="h-4 w-4" />
                      <span>{project.forks}</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" className=" border-white/20">
                  View Project
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}

