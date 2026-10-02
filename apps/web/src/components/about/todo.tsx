import { Checkbox } from "@/components/ui/checkbox";

import todoData from "./todo.json";

export function Todo() {
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {todoData.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <Checkbox disabled className="mt-0.5 disabled:opacity-100" />
          <span className="leading-5">{item}</span>
        </li>
      ))}
    </ul>
  );
}
