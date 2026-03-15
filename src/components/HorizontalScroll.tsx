import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
}

const HorizontalScroll = ({ children, className = "" }: HorizontalScrollProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative group/scroll">
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-background via-background/80 to-transparent flex items-center justify-start pl-2 opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300"
      >
        <div className="w-8 h-8 rounded-full glass flex items-center justify-center">
          <ChevronLeft size={16} className="text-foreground" />
        </div>
      </button>

      <div
        ref={scrollRef}
        className={`flex gap-4 overflow-x-auto scrollbar-hide px-5 py-2 scroll-smooth ${className}`}
      >
        {children}
      </div>

      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-background via-background/80 to-transparent flex items-center justify-end pr-2 opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300"
      >
        <div className="w-8 h-8 rounded-full glass flex items-center justify-center">
          <ChevronRight size={16} className="text-foreground" />
        </div>
      </button>
    </div>
  );
};

export default HorizontalScroll;
