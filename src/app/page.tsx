import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">IB Planner</CardTitle>
          <CardDescription>
            Track your subjects, manage your tasks, survive the IBDP.
          </CardDescription>
          <Button className="mt-4">Get Started</Button>
        </CardHeader>
      </Card>
    </main>
  )
}