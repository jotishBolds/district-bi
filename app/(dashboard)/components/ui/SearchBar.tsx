"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SearchBar() {
  const [query, setQuery] = useState("");

  const handleClear = () => {
    setQuery("");
  };

  return (
    <div className="relative w-full">
      <Search className="h-4 w-4 absolute left-3 top-2.5 text-gray-400" />
      <Input
        placeholder="Search applications or case numbers..."
        className="pl-9 pr-8 h-9 bg-slate-50 focus:bg-white border-slate-200 focus:ring-2 ring-blue-100"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 absolute right-2 top-2 p-0 text-gray-400 hover:text-gray-600"
          onClick={handleClear}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
