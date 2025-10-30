import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { LuxuryCarousel } from "../LuxuryCarousel";

type TabKey = "manicure" | "pestanas";

interface GalleryItem {
  id: number;
  image: string;
  title: string;
  category: "Manicure" | "Pestañas";
}

const galleryItems: Record<TabKey, GalleryItem[]> = {
  manicure: [
    { id: 1, image: "/assets/unas1.jfif", title: "Manicure 1", category: "Manicure" },
    { id: 2, image: "/assets/unas2.jfif", title: "Manicure 2", category: "Manicure" },
    { id: 3, image: "/assets/unas3.jfif", title: "Manicure 3", category: "Manicure" },
    { id: 4, image: "/assets/unas4.jfif", title: "Manicure 4", category: "Manicure" },
  ],
  pestanas: [
    { id: 8,  image: "/assets/pestana1.jfif", title: "Pestañas 1", category: "Pestañas" },
    { id: 9,  image: "/assets/pestana2.jfif", title: "Pestañas 2", category: "Pestañas" },
    { id: 10, image: "/assets/pestana3.jfif", title: "Pestañas 3", category: "Pestañas" },
  ],
};

const tabs: TabKey[] = ["manicure", "pestanas"];

export function GallerySection() {
  return (
    <section className="py-20 content-layer">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2
            className="font-serif text-4xl md:text-5xl mb-4 luxury-text-shadow"
            style={{ color: "#ffffff" }}
          >
            Nuestros Trabajos
          </h2>
        </div>

        {/* Gallery Content */}
        <div className="max-w-6xl mx-auto space-y-12">
          <Tabs defaultValue="manicure" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-lg mx-auto mb-8 bg-[#1a1a1a] border-[#D9C7A1]">
              <TabsTrigger
                value="manicure"
                className="font-sans text-sm text-white data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0B0B0B]"
              >
                Manicure
              </TabsTrigger>
              <TabsTrigger
                value="pestanas"
                className="font-sans text-sm text-white data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0B0B0B]"
              >
                Pestañas
              </TabsTrigger>
            </TabsList>

            {tabs.map((tab) => (
              <TabsContent key={tab} value={tab}>
                <LuxuryCarousel
                  items={galleryItems[tab]}
                  autoplay
                  autoplayInterval={5000}
                  showDots
                  showArrows
                  itemsPerView={3}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </section>
  );
}
