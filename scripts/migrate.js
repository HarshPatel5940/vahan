#!/usr/bin/env node

import { readFileSync } from 'fs'
import { join } from 'path'
import { Pool } from 'pg'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'vahan_db',
  user: process.env.DB_USER || 'vahan_user',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production'
}

async function migrate() {
  const pool = new Pool(config)
  
  try {
    console.log('🔄 Starting database migration...')
    
    // Read schema file
    const schemaPath = join(__dirname, '../database/schema.sql')
    const schema = readFileSync(schemaPath, 'utf8')
    
    // Execute schema
    await pool.query(schema)
    
    console.log('✅ Database migration completed successfully!')
    
    // Check if tables were created
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    console.log('📋 Created tables:')
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Check if required environment variables are set
const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:')
  missingEnvVars.forEach(envVar => {
    console.error(`  - ${envVar}`)
  })
  console.error('\nPlease set these environment variables and try again.')
  process.exit(1)
}

migrate()
