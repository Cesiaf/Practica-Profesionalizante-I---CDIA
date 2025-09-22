export interface Profile {
  id: string
  email: string
  full_name?: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "pending" | "in_progress" | "completed"
  due_date?: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  title: string
  content: string
  task_id?: string
  user_id: string
  created_at: string
  updated_at: string
}
