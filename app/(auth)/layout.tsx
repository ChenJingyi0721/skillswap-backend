import Navbar from "@/components/Navbar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="pt-20 pb-20 md:pb-6">
        <div className="mx-auto max-w-6xl px-4">{children}</div>
      </main>
    </>
  );
}
