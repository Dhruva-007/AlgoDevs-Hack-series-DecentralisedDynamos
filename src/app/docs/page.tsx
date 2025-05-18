import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Book, Code, Terminal, ArrowRight } from "lucide-react"

const sections = [
  {
    title: "Getting Started",
    description: "Learn the basics of Algorand development",
    icon: Book,
    links: ["Quick Start", "Installation", "Basic Concepts"],
  },
  {
    title: "Smart Contracts",
    description: "Build and deploy smart contracts on Algorand",
    icon: Code,
    links: ["TEAL", "PyTeal", "Best Practices"],
  },
  {
    title: "SDKs & APIs",
    description: "Integrate Algorand into your applications",
    icon: Terminal,
    links: ["JavaScript SDK", "Python SDK", "REST APIs"],
  },
]

export default function DocsPage() {
  return (
    <main className="min-h-screen animated-gradient pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Documentation</h1>
          <p className="text-gray-400">Everything you need to build on the Algorand blockchain</p>
        </div>

        <div className="glass-effect rounded-lg p-4 mb-12 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Search documentation..." className="pl-10 bg-transparent border-white/20 text-white" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <Card key={section.title} className="glass-effect p-6">
              <div className="mb-6">
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-4">
                  <section.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{section.title}</h3>
                <p className="text-gray-400">{section.description}</p>
              </div>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/5"
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      {link}
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}

