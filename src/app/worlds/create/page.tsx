import { Navbar } from "@/components/navbar";
import { WorldForm } from "./world-form";

export default function CreateWorldPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create a World
        </h1>
        <p className="mt-2 text-zinc-400">
          Set the basics for your world — you can change everything later.
        </p>
        <WorldForm />
      </main>
    </div>
  );
}
