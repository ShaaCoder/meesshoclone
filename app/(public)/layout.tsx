import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-900">
      
      {/* 🔥 Updated Header - Blue Theme */}
      <Header />

      {/* Main Content Area with subtle blue accents */}
      <main className="flex-1 bg-white">
        {children}
      </main>
<BottomNav />
     <Footer />
    </div>
  );
}