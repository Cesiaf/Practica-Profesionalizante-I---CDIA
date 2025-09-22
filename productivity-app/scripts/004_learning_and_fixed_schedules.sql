-- Tabla para guardar correcciones de tiempo del usuario (aprendizaje)
CREATE TABLE IF NOT EXISTS time_estimation_corrections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_title TEXT NOT NULL,
    task_description TEXT,
    ai_estimated_duration INTEGER NOT NULL, -- en minutos
    user_corrected_duration INTEGER NOT NULL, -- en minutos
    correction_reason TEXT, -- razón del usuario para el cambio
    task_category TEXT, -- categoría de la tarea para aprendizaje
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabla para tareas con horarios fijos
CREATE TABLE IF NOT EXISTS fixed_schedule_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    fixed_start_time TIME NOT NULL, -- hora fija de inicio
    fixed_end_time TIME NOT NULL, -- hora fija de fin
    days_of_week INTEGER[] NOT NULL, -- días de la semana (0=domingo, 1=lunes, etc.)
    is_recurring BOOLEAN DEFAULT true, -- si se repite semanalmente
    priority_level INTEGER DEFAULT 3, -- 1=alta, 2=media, 3=baja
    is_movable BOOLEAN DEFAULT false, -- si se puede mover en caso de conflicto
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_time_corrections_user_id ON time_estimation_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_time_corrections_category ON time_estimation_corrections(task_category);
CREATE INDEX IF NOT EXISTS idx_fixed_schedule_user_id ON fixed_schedule_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_fixed_schedule_days ON fixed_schedule_tasks USING GIN(days_of_week);

-- RLS (Row Level Security) para time_estimation_corrections
ALTER TABLE time_estimation_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own time corrections" ON time_estimation_corrections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time corrections" ON time_estimation_corrections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time corrections" ON time_estimation_corrections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time corrections" ON time_estimation_corrections
    FOR DELETE USING (auth.uid() = user_id);

-- RLS para fixed_schedule_tasks
ALTER TABLE fixed_schedule_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fixed schedules" ON fixed_schedule_tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fixed schedules" ON fixed_schedule_tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fixed schedules" ON fixed_schedule_tasks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fixed schedules" ON fixed_schedule_tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_time_corrections_updated_at BEFORE UPDATE ON time_estimation_corrections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fixed_schedule_updated_at BEFORE UPDATE ON fixed_schedule_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
