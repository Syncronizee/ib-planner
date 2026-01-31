import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">IB Planner</CardTitle>
          <CardDescription>
            Track your subjects, manage your tasks, survive the IBDP.
          </CardDescription>
          <div className="flex gap-2 mt-4 justify-center">
            <Link href="/login">
              <Button variant="outline">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </CardHeader>
      </Card>
    </main>
  )
}