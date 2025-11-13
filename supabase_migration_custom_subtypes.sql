-- Migration: Add user_custom_subtypes table for hierarchical resource types
-- This table stores user-defined subtypes for categories like drinks, activities, etc.

CREATE TABLE IF NOT EXISTS user_custom_subtypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_key TEXT NOT NULL,
  subtype_name TEXT NOT NULL,
  icon TEXT DEFAULT '📌',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category_key, subtype_name)
);

-- Add RLS (Row Level Security) policies
ALTER TABLE user_custom_subtypes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own custom subtypes
CREATE POLICY "Users can view their own custom subtypes"
  ON user_custom_subtypes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own custom subtypes
CREATE POLICY "Users can create their own custom subtypes"
  ON user_custom_subtypes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own custom subtypes
CREATE POLICY "Users can update their own custom subtypes"
  ON user_custom_subtypes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own custom subtypes
CREATE POLICY "Users can delete their own custom subtypes"
  ON user_custom_subtypes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups by user
CREATE INDEX idx_user_custom_subtypes_user_id ON user_custom_subtypes(user_id);

-- Create index for faster lookups by category
CREATE INDEX idx_user_custom_subtypes_category ON user_custom_subtypes(category_key);

-- Add comment for documentation
COMMENT ON TABLE user_custom_subtypes IS 'Stores user-defined subtypes for multi-type categories like drinks (beer/wine/cocktail) and activities (hike/concert/museum)';
