import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 flex flex-col gap-4 items-center">
          <h1 className="text-3xl font-semibold">EasyBazar - test githubwow 🎉</h1>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Przycisk testowy
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
