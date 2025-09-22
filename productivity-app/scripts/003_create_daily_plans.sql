-- Create daily_plans table for storing AI-generated daily schedules
CREATE TABLE IF NOT EXISTS public.daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Plan Diario',
  total_tasks INTEGER DEFAULT 0,
  estimated_duration INTEGER DEFAULT 0, -- in minutes
  ai_suggestions JSONB DEFAULT '[]'::jsonb,
  time_blocks JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, plan_date)
);

-- Create daily_plan_tasks junction table for linking tasks to daily plans
CREATE TABLE IF NOT EXISTS public.daily_plan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_plan_id UUID NOT NULL REFERENCES public.daily_plans(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  scheduled_start_time TIME,
  scheduled_end_time TIME,
  estimated_duration INTEGER, -- in minutes
  actual_duration INTEGER, -- in minutes (filled when completed)
  position INTEGER NOT NULL DEFAULT 0,
  ai_optimized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(daily_plan_id, task_id)
);

-- Enable Row Level Security
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plan_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_plans
CREATE POLICY "daily_plans_select_own" ON public.daily_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "daily_plans_insert_own" ON public.daily_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_plans_update_own" ON public.daily_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "daily_plans_delete_own" ON public.daily_plans
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for daily_plan_tasks
CREATE POLICY "daily_plan_tasks_select_own" ON public.daily_plan_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.daily_plans dp 
      WHERE dp.id = daily_plan_id AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "daily_plan_tasks_insert_own" ON public.daily_plan_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_plans dp 
      WHERE dp.id = daily_plan_id AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "daily_plan_tasks_update_own" ON public.daily_plan_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.daily_plans dp 
      WHERE dp.id = daily_plan_id AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "daily_plan_tasks_delete_own" ON public.daily_plan_tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.daily_plans dp 
      WHERE dp.id = daily_plan_id AND dp.user_id = auth.uid()
    )
  );

-- Add updated_at trigger for daily_plans
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_daily_plans_updated_at 
  BEFORE UPDATE ON public.daily_plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add duration estimation to existing tasks table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'tasks' AND column_name = 'estimated_duration') THEN
    ALTER TABLE public.tasks ADD COLUMN estimated_duration INTEGER DEFAULT 60; -- default 1 hour
  END IF;
END $$;
