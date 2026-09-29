import { useState, type FormEvent } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import { TextField } from './Input';

// Ô tìm theo từ khóa trên thanh công cụ của bảng quản trị. Chỉ gửi khi bấm "Tìm" hoặc Enter để không gọi API theo
// từng phím gõ. `key` của phần tử cha đổi theo giá trị trên URL để ô nhập đồng bộ khi quay lại bằng nút Back.

interface SearchFormProps {
  label: string;
  value: string;
  placeholder?: string;
  onSearch: (keyword: string) => void;
}

export function SearchForm({ label, value, placeholder, onSearch }: SearchFormProps) {
  const [text, setText] = useState(value);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(text.trim());
  };
  return (
    <search className="flex min-w-0 flex-1">
      <form onSubmit={submit} className="flex min-w-0 flex-1 items-end gap-2">
        <TextField
          label={label}
          type="search"
          name="tu-khoa"
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          containerClassName="min-w-0 flex-1"
        />
        <Button type="submit" variant="secondary" className="h-11">
          <Icon name="search" size={16} />
          Tìm
        </Button>
      </form>
    </search>
  );
}
