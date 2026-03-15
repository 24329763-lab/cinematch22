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
      {/* Left arrow */}
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-r from-background to-transparent flex items-center justify-start pl-1 opacity-0 group-hover/scroll:opacity-100 transition-opacity"
      >
        <ChevronLeft size={20} className="text-foreground" />
      </button>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className={`flex gap-3 overflow-x-auto scrollbar-hide px-4 py-1 scroll-smooth ${className}`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-background to-transparent flex items-center justify-end pr-1 opacity-0 group-hover/scroll:opacity-100 transition-opacity"
      >
        <ChevronRight size={20} className="text-foreground" />
      </button>
    </div>
  );
};

export default HorizontalScroll;
