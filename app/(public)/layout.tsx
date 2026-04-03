import Header from "@/components/Header";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">

      {/* 🔥 Header only for public pages */}
      <Header />

      <main className="flex-1">{children}</main>

    </div>
  );
}