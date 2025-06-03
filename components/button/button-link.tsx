"use client";
import { FileText } from "lucide-react";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

type ButtonLinkProps = {
  path: string;
  label: string;
};

const ButtonLink = ({ path, label }: ButtonLinkProps) => {
  const router = useRouter();
  return (
    <div>
      <Button
        onClick={() => router.push(path)}
        className="bg-blue-700 hover:bg-blue-800 cursor-pointer"
        size="lg"
      >
        <FileText className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </div>
  );
};

export default ButtonLink;
