// app/test-frontdesk/page.tsx
"use client";

import { useState, useEffect } from "react";

interface ApplicationData {
  [key: string]: unknown;
}

export default function TestFrontdesk() {
  const [data, setData] = useState<ApplicationData | ApplicationData[] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/frontdesk/applications");
        const result = await response.json();

        if (response.ok) {
          setData(result);
        } else {
          setError(result.error || "Failed to fetch");
        }
      } catch (err) {
        setError("Network error");
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Frontdesk Applications Test</h1>
      <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
