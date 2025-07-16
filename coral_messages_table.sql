-- Create coral_messages table for storing Coral Protocol messages
CREATE TABLE IF NOT EXISTS coral_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    from_agent_id TEXT NOT NULL,
    to_agent_id TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'message',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_coral_messages_user_id ON coral_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_coral_messages_thread_id ON coral_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_coral_messages_agent_id ON coral_messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_coral_messages_timestamp ON coral_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_coral_messages_from_agent ON coral_messages(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_coral_messages_to_agent ON coral_messages(to_agent_id);

-- Enable Row Level Security
ALTER TABLE coral_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own coral messages" ON coral_messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own coral messages" ON coral_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coral messages" ON coral_messages
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coral messages" ON coral_messages
    FOR DELETE USING (auth.uid() = user_id);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_coral_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_coral_messages_updated_at
    BEFORE UPDATE ON coral_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_coral_messages_updated_at();

-- Grant necessary permissions
GRANT ALL ON coral_messages TO authenticated;
GRANT ALL ON coral_messages TO service_role;
