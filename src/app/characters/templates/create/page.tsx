import { Navbar } from "@/components/navbar";
import { TemplateForm } from "./template-form";

export default function CreateTemplatePage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create a Character Template
        </h1>
        <p className="mt-2 text-zinc-400">
          Define the fields characters built from this template will have.
          You can reorder, edit, or remove fields at any time.
        </p>
        <TemplateForm />
      </main>
    </div>
  );
}
