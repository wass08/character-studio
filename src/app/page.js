import Scene from "@/components/scene";
import UI from "@/components/ui/UI";

export default function Home() {
  return (
    <div className="h-screen w-full bg-zinc-50 font-sans dark:bg-black">
      <main className="flex h-screen w-full flex-col bg-white dark:bg-black">
        <Scene />
        <UI />
      </main>
    </div>
  );
}
