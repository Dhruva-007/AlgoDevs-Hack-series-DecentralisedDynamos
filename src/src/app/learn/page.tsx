import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, BookOpen, Clock, ArrowRight } from "lucide-react"

const resources = [
  {
    id: 1,
    title: "Getting Started with Algorand",
    description: "Learn the basics of Algorand blockchain and smart contracts",
    category: "Beginner",
    duration: "2 hours",
    image: "/placeholder.svg?height=200&width=400",
  },
  // Add more resources...
]

export default function LearnPage() {
  return (
    <main className="min-h-screen animated-gradient pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Learn Algorand Development</h1>
          <p className="text-gray-400">Comprehensive resources to help you master Algorand blockchain development</p>
        </div>

        <div className="glass-effect rounded-lg p-4 mb-12 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search learning resources..."
              className="pl-10 bg-transparent border-white/20 text-white"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => (
            <Card key={resource.id} className="glass-effect overflow-hidden">
              <img
                src={resource.image || "/placeholder.svg"}
                alt={resource.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-400">{resource.category}</span>
                  <Clock className="h-4 w-4 text-gray-400 ml-2" />
                  <span className="text-sm text-gray-400">{resource.duration}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{resource.title}</h3>
                <p className="text-gray-400 mb-4">{resource.description}</p>
                <Button className="w-full bg-white text-black hover:bg-white/90">
                  Start Learning <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}

