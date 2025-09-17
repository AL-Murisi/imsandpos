import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../components/ui/button";
type task = {
  tasks: string[];
  setTasks: (updatedTasks: string[]) => void;
};
export default function TasksInput({ tasks, setTasks }: task) {
  const [inputValue, setInputValue] = useState("");

  const addTask = () => {
    if (inputValue.trim() && !tasks.includes(inputValue.trim())) {
      setTasks([...tasks, inputValue.trim()]);
      setInputValue("");
    }
  };

  const removeTask = (task: string) => {
    setTasks(tasks.filter((t) => t !== task));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tasks.map((task) => (
          <Badge
            key={task}
            onClick={() => removeTask(task)}
            className="flex items-center gap-1 cursor-pointer"
          >
            {task} <X className="h-3 w-3 " />
            {/* <Button >
            </Button> */}
          </Badge>
        ))}
      </div>
      <Input
        placeholder="Add task and press Enter"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTask();
          }
        }}
      />
    </div>
  );
}
