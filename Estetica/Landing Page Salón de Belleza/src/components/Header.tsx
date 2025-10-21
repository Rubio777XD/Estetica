import { Button } from "./ui/button";

export function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 p-6">
      <div className="container mx-auto flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          className="border-amber-400 text-black hover:bg-amber-400 hover:text-black"
        >
          Login empleados
        </Button>
      </div>
    </header>
  );
}