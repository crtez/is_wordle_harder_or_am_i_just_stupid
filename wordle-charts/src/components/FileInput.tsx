import { Input } from "@/components/ui/input"

interface FileInputProps {
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  fileName: string;
}

export function FileInput({ onChange, className, fileName }: FileInputProps) {
  return (
    <div className="grid items-center">
      <div className="relative h-10">
        <Input
          id="wordle-data"
          type="file"
          accept=".json"
          onChange={onChange}
          className={`${className} opacity-0 absolute inset-0 cursor-pointer h-full`}
        />
        <Input 
          readOnly 
          value={fileName}
          className="pointer-events-none h-full"
        />
      </div>
    </div>
  )
} 