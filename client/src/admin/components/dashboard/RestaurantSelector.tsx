import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RESTAURANTS } from "@/admin/data/mock_canonical";

interface RestaurantSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

export function RestaurantSelector({ value, onChange }: RestaurantSelectorProps) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-[180px] h-8 bg-white/10 border-white/20 text-white hover:bg-white/20 focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="식당 선택" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">전체 식당</SelectItem>
                {RESTAURANTS.map((restaurant) => (
                    <SelectItem key={restaurant.id} value={restaurant.id}>
                        {restaurant.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
