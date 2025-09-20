import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Option {
  id: string;
  name: string;
}

interface SelectFieldProps {
  options: Option[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder: string;
}

export function SelectField({
  options,
  value,
  onValueChange,
  placeholder,
}: SelectFieldProps) {
  //  const removeBadge = (val: string) => {
  //   onValueChange(value.filter((v) => v !== val));
  // };
  return (
    <Select onValueChange={onValueChange}>
      <SelectTrigger className="border-primary rounded-md border-2">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="All">الكل</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
