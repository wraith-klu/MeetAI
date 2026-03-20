import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useAgentsFilters } from "../../hooks/use-agents-filters";

export const AgentsSearchFilter = () => {
    const [filters, setFilters] = useAgentsFilters();
    return (
        <div className="relative">
            <SearchIcon className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <Input
                placeholder="Filter by name"
                className="h-9 bg-white w-50 pl-7"
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
            />
            <SearchIcon className="size-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
    );
};