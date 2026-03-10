import type { AgentName, TaskRecord } from "@/types/task";

export function groupTasksByAgent(tasks: TaskRecord[]): Record<AgentName, TaskRecord[]> {
  return tasks.reduce<Record<string, TaskRecord[]>>((acc, task) => {
    if (!acc[task.agent]) {
      acc[task.agent] = [];
    }
    acc[task.agent].push(task);
    return acc;
  }, {}) as Record<AgentName, TaskRecord[]>;
}

export function bucketizeTasks(tasks: TaskRecord[]) {
  return {
    inProgress: tasks.filter((task) => task.status === "in_progress"),
    queued: tasks.filter((task) => task.status === "queued"),
    completed: tasks.filter((task) => task.status === "completed"),
  };
}
