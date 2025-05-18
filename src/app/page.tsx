"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Code, Gem, GitBranch, GraduationCap } from "lucide-react"
import { motion, useScroll, useTransform, useInView } from "framer-motion"
import { createClient } from "@supabase/supabase-js"
import { Skeleton } from "@/components/ui/skeleton"

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
)

// Define Project interface
interface Project {
  id: number
  name: string
  description: string
  stage?: string
  created_at: string
}

const tags = ["Smart Contracts", "DeFi", "NFTs", "Web3", "Blockchain", "dApps", "AI", "Development"]

const features = [
  {
    title: "Bounties",
    description: "Earn rewards by solving blockchain challenges and contributing to the ecosystem",
    icon: Gem,
  },
  {
    title: "Open Source Projects",
    description: "Collaborate on cutting-edge Algorand projects and shape the future of blockchain",
    icon: GitBranch,
  },
  {
    title: "Learning Resources",
    description: "Access comprehensive tutorials and documentation to master Algorand development",
    icon: GraduationCap,
  },
]

const stats = [
  { label: "Active Developers", value: "5,000+" },
  { label: "Total Bounties", value: "$500K+" },
  { label: "Projects Launched", value: "1,000+" },
  { label: "Community Members", value: "50,000+" },
]

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  // Refs for scroll animations
  const heroRef = useRef(null)
  const statsRef = useRef(null)
  const featuresRef = useRef(null)
  const ctaRef = useRef(null)
  const projectsRef = useRef(null)

  // Check if sections are in view
  const heroInView = useInView(heroRef, { once: false, amount: 0.2 })
  const statsInView = useInView(statsRef, { once: false, amount: 0.3 })
  const featuresInView = useInView(featuresRef, { once: false, amount: 0.3 })
  const ctaInView = useInView(ctaRef, { once: false, amount: 0.5 })
  const projectsInView = useInView(projectsRef, { once: false, amount: 0.2 })

  // Parallax effect for hero section
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 500], [0, -150])
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.3])

  // Fetch projects from database
  useEffect(() => {
    async function fetchProjects() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(3)

        if (error) throw error

        // Add a small delay to show the skeleton effect
        setTimeout(() => {
          setProjects(data || [])
          setLoading(false)
        }, 800)
      } catch (error) {
        console.error("Error fetching projects:", error)
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  // Enable smooth scrolling
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth"
    return () => {
      document.documentElement.style.scrollBehavior = "auto"
    }
  }, [])

  return (
    <main className="bg-[#0c0909] overflow-x-hidden">
      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen pt-20">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0909] via-[#6104d7]/20 to-[#ec0033]/20 pointer-events-none" />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="container relative mx-auto px-4 pt-20 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl"
          >
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-6 tracking-tighter">
              ALGO
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6104d7] to-[#ec0033]">DEVS</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl">
              Join the future of blockchain development. Build, learn, and innovate with the Algorand community.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
              className="flex flex-wrap gap-4 mb-12"
            >
              <Button size="lg" className="bg-[#6104d7] hover:bg-[#6104d7]/90 text-white border-0">
                Start Building
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-[#ec0033] text-[#ec0033] hover:bg-[#ec0033] hover:text-white"
              >
                View Bounties
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={heroInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
              className="flex flex-wrap gap-2"
            >
              {tags.map((tag, index) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, y: 10 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  transition={{ duration: 0.4, delay: 0.6 + index * 0.05, ease: "easeOut" }}
                  className="px-4 py-1.5 rounded-full text-sm font-medium bg-white/5 text-white/80 border border-white/10"
                >
                  {tag}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.7, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
          className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[#6104d7]/20 blur-3xl rounded-full transform translate-x-1/2 translate-y-1/2"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 1,
          }}
          className="absolute top-1/2 right-1/4 w-48 h-48 bg-[#ec0033]/20 blur-3xl rounded-full"
        />
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="py-20 bg-black/40">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                animate={statsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={statsInView ? { scale: 1 } : { scale: 0.8 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1, type: "spring" }}
                  className="text-4xl font-bold text-white mb-2"
                >
                  {stat.value}
                </motion.div>
                <div className="text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-4xl font-bold text-white mb-12 text-center"
          >
            Build the Future of <span className="text-[#6104d7]">Blockchain</span>
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                transition={{ duration: 0.6, delay: index * 0.2, ease: "easeOut" }}
              >
                <Card className="bg-black/40 border-white/10 h-full hover:border-[#6104d7]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#6104d7]/10">
                  <CardContent className="p-6">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <feature.icon className="h-12 w-12 text-[#ec0033] mb-4" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-gray-400">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        ref={ctaRef}
        className="py-20 bg-gradient-to-r from-[#6104d7]/20 to-[#ec0033]/20 relative overflow-hidden"
      >
        <motion.div
          animate={{
            x: [0, 100, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
          className="absolute -top-40 -left-40 w-80 h-80 bg-[#6104d7]/30 blur-3xl rounded-full"
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 15,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 2,
          }}
          className="absolute -bottom-40 -right-40 w-80 h-80 bg-[#ec0033]/30 blur-3xl rounded-full"
        />

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={ctaInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">Ready to Start Building?</h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join our community of developers and start contributing to the Algorand ecosystem
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" className="bg-[#ec0033] hover:bg-[#ec0033]/90 text-white">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Latest Projects Section */}
      <section ref={projectsRef} className="py-20">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={projectsInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-4xl font-bold text-white mb-12"
          >
            Latest Projects
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {loading
              ? // Skeleton loading state
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <Card key={i} className="bg-black/40 border-white/10">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <Skeleton className="h-8 w-8 rounded-md bg-gray-700" />
                          <Skeleton className="h-6 w-20 rounded-full bg-gray-700" />
                        </div>
                        <Skeleton className="h-7 w-3/4 mb-2 bg-gray-700" />
                        <Skeleton className="h-4 w-full mb-2 bg-gray-700" />
                        <Skeleton className="h-4 w-2/3 mb-4 bg-gray-700" />
                        <Skeleton className="h-9 w-32 bg-gray-700" />
                      </CardContent>
                    </Card>
                  ))
              : // Actual projects from database
                projects.length > 0
                ? projects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={projectsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                      transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
                    >
                      <Card className="bg-black/40 border-white/10 hover:border-[#6104d7]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#6104d7]/10 h-full">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <Code className="h-8 w-8 text-[#6104d7]" />
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#6104d7]/20 text-[#6104d7]">
                              {project.stage || "Active"}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">{project.name}</h3>
                          <p className="text-gray-400 mb-4">{project.description}</p>
                          <motion.div
                            whileHover={{ x: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            <Button variant="ghost" className="text-[#6104d7] hover:text-[#6104d7]/90">
                              Learn More <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </motion.div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                : // Fallback if no projects found
                  Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 30 }}
                        animate={projectsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                        transition={{ duration: 0.6, delay: i * 0.15, ease: "easeOut" }}
                      >
                        <Card className="bg-black/40 border-white/10 hover:border-[#6104d7]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#6104d7]/10 h-full">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <Code className="h-8 w-8 text-[#6104d7]" />
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#6104d7]/20 text-[#6104d7]">
                                Active
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Project {i + 1}</h3>
                            <p className="text-gray-400 mb-4">A decentralized application built on Algorand</p>
                            <motion.div
                              whileHover={{ x: 5 }}
                              transition={{ type: "spring", stiffness: 400, damping: 10 }}
                            >
                              <Button variant="ghost" className="text-[#6104d7] hover:text-[#6104d7]/90">
                                Learn More <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </motion.div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
          </div>
        </div>
      </section>
    </main>
  )
}

