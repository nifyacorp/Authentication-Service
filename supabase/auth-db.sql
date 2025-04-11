-- Create UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (simplified)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    google_id VARCHAR(255) UNIQUE,
    picture_url TEXT
);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE
);

-- Password reset requests table
CREATE TABLE password_reset_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_password_reset_token ON password_reset_requests(token);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at field when a user is updated
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to sync users with backend service (placeholder)
CREATE OR REPLACE FUNCTION sync_user_to_backend(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Placeholder for actual synchronization logic
    -- This would typically make an API call or use a message queue
    -- to notify the backend service of the user creation/update
    RAISE NOTICE 'Syncing user % to backend service', user_uuid;
    -- Implementation would depend on your architecture
END;
$$ LANGUAGE plpgsql;

-- Trigger to call sync function when a user is created
CREATE OR REPLACE FUNCTION trigger_user_sync()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM sync_user_to_backend(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the sync function after a user is inserted
CREATE TRIGGER after_user_insert
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_user_sync();