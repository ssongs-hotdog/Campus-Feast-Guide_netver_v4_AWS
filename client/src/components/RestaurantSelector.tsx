import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RestaurantSelectorProps {
    restaurants: { id: string; name: string }[];
    selectedId: string;
    onSelect: (id: string) => void;
}

export function RestaurantSelector({
    restaurants,
    selectedId,
    onSelect,
}: RestaurantSelectorProps) {
    return (
        <div className="flex overflow-x-auto gap-2 px-4 pb-2 scrollbar-hide w-full">
            <Button
                variant="ghost"
                onClick={() => onSelect("all")}
                className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap h-auto",
                    selectedId === "all"
                        ? "bg-[#0E4A84] text-white font-bold shadow-sm hover:bg-[#0E4A84]/90 hover:text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
            >
                전체
            </Button>
            {restaurants.map((restaurant) => (
                <Button
                    key={restaurant.id}
                    variant="ghost"
                    onClick={() => onSelect(restaurant.id)}
                    className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap h-auto",
                        selectedId === restaurant.id
                            ? "bg-[#0E4A84] text-white font-bold shadow-sm hover:bg-[#0E4A84]/90 hover:text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                >
                    {restaurant.name}
                </Button>
            ))}
        </div>
    );
}
