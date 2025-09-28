import Fastify from 'fastify';
import dotenv from 'dotenv';
import { CacheManager } from './lib/cache.js';
import { ICSService } from './lib/ics.js';
import { OAuthService } from './lib/oauth.js';
import { TasksService } from './lib/tasks.js';
import { Event, Task, HealthResponse, MetaResponse } from './types.js';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '5055');
const BIND_ADDRESS = process.env.BIND_ADDRESS || '127.0.0.1';
const ICS_URL = process.env.ICS_URL || '';
const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS || '300');
const TIMEZONE = process.env.TIMEZONE || 'America/Toronto';
const DATA_DIR = process.env.DATA_DIR || './data';
const SECRETS_DIR = process.env.SECRETS_DIR || './secrets';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change_me';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://127.0.0.1:5555/oauth2callback';
const GOOGLE_SCOPES = [process.env.GOOGLE_SCOPES || 'https://www.googleapis.com/auth/tasks.readonly'];

// Initialize services
const cacheManager = new CacheManager(DATA_DIR, CACHE_TTL_SECONDS);
const icsService = new ICSService({ url: ICS_URL, timezone: TIMEZONE });

// Only initialize OAuth services if credentials are provided
const hasOAuthCredentials = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET;
let oauthService: OAuthService | null = null;
let tasksService: TasksService | null = null;

if (hasOAuthCredentials) {
  oauthService = new OAuthService({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: GOOGLE_REDIRECT_URI,
    scopes: GOOGLE_SCOPES,
    secretsDir: SECRETS_DIR
  });
  tasksService = new TasksService(oauthService, { timezone: TIMEZONE });
}

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: 'info'
  }
});

// CORS for localhost development
fastify.register(import('@fastify/cors'), {
  origin: ['http://localhost', 'http://127.0.0.1', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
});

// Health check endpoint
fastify.get('/api/health', async (request, reply) => {
  const health: HealthResponse = {
    ok: true,
    uptime: process.uptime(),
    version: '1.0.0'
  };
  return health;
});

// Meta endpoint - returns cache status and metadata
fastify.get('/api/meta', async (request, reply) => {
  try {
    const calendarMeta = await cacheManager.getCacheMetadata('calendar');
    const tasksMeta = await cacheManager.getCacheMetadata('tasks');
    
    const meta: MetaResponse = {
      calendar: calendarMeta,
      tasks: tasksMeta,
      timezone: TIMEZONE,
      nextRefresh: Math.min(
        calendarMeta.timestamp + calendarMeta.ttl,
        tasksMeta.timestamp + tasksMeta.ttl
      )
    };
    
    return meta;
  } catch (error) {
    reply.code(500);
    return { error: 'Failed to get metadata' };
  }
});

// Calendar endpoint
fastify.get('/api/calendar', async (request, reply) => {
  try {
    // Check if cache is fresh
    const isFresh = await cacheManager.isCacheFresh('calendar');
    
    if (!isFresh) {
      // Try to refresh cache
      const lockAcquired = await cacheManager.acquireLock('calendar');
      if (lockAcquired) {
        try {
          console.log('Refreshing calendar cache...');
          const events = await icsService.fetchAndParseEvents();
          await cacheManager.setEvents(events);
          console.log(`Cached ${events.length} calendar events`);
        } catch (error) {
          console.error('Error refreshing calendar:', error);
          // Continue to serve stale cache if available
        } finally {
          await cacheManager.releaseLock('calendar');
        }
      }
    }

    const events = await cacheManager.getEvents();
    
    if (events.length === 0 && !await cacheManager.isCacheFresh('calendar')) {
      reply.code(503);
      return { error: 'Calendar data unavailable' };
    }

    return events;
  } catch (error) {
    console.error('Error in calendar endpoint:', error);
    reply.code(503);
    return { error: 'Calendar service unavailable' };
  }
});

// Tasks endpoint
fastify.get('/api/tasks', async (request, reply) => {
  try {
    // Check if OAuth is configured
    if (!tasksService) {
      return { 
        error: 'Google Tasks not configured',
        message: 'Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file'
      };
    }

    // Check if cache is fresh
    const isFresh = await cacheManager.isCacheFresh('tasks');
    
    if (!isFresh) {
      // Try to refresh cache
      const lockAcquired = await cacheManager.acquireLock('tasks');
      if (lockAcquired) {
        try {
          console.log('Refreshing tasks cache...');
          const tasks = await tasksService.fetchTasks();
          await cacheManager.setTasks(tasks);
          console.log(`Cached ${tasks.length} tasks`);
        } catch (error) {
          console.error('Error refreshing tasks:', error);
          // Continue to serve stale cache if available
        } finally {
          await cacheManager.releaseLock('tasks');
        }
      }
    }

    const tasks = await cacheManager.getTasks();
    
    if (tasks.length === 0 && !await cacheManager.isCacheFresh('tasks')) {
      reply.code(503);
      return { error: 'Tasks data unavailable' };
    }

    return tasks;
  } catch (error) {
    console.error('Error in tasks endpoint:', error);
    reply.code(503);
    return { error: 'Tasks service unavailable' };
  }
});

// Admin refresh endpoint
fastify.post('/api/admin/refresh', async (request, reply) => {
  // Check for admin token or localhost origin
  const authHeader = request.headers.authorization;
  const isLocalhost = request.ip === '127.0.0.1' || request.ip === '::1';
  
  if (!isLocalhost && authHeader !== `Bearer ${ADMIN_TOKEN}`) {
    reply.code(403);
    return { error: 'Unauthorized' };
  }

  try {
    // Force refresh both caches
    console.log('Manual cache refresh requested...');
    
    // Refresh calendar
    try {
      const events = await icsService.fetchAndParseEvents();
      await cacheManager.setEvents(events);
      console.log(`Refreshed ${events.length} calendar events`);
    } catch (error) {
      console.error('Error refreshing calendar:', error);
    }

    // Refresh tasks (only if OAuth is configured)
    if (tasksService) {
      try {
        const tasks = await tasksService.fetchTasks();
        await cacheManager.setTasks(tasks);
        console.log(`Refreshed ${tasks.length} tasks`);
      } catch (error) {
        console.error('Error refreshing tasks:', error);
      }
    } else {
      console.log('⏭️  Skipping tasks refresh (OAuth not configured)');
    }

    return { success: true, message: 'Cache refresh completed' };
  } catch (error) {
    reply.code(500);
    return { error: 'Cache refresh failed' };
  }
});

// Startup function
async function start() {
  try {
    // Ensure data directory exists
    await cacheManager.ensureDataDir();
    
    // Start server
    await fastify.listen({ port: PORT, host: BIND_ADDRESS });
    console.log(`🚀 Kiosk API server running on http://${BIND_ADDRESS}:${PORT}`);
    console.log(`📁 Data directory: ${DATA_DIR}`);
    console.log(`🔐 Secrets directory: ${SECRETS_DIR}`);
    console.log(`📅 ICS URL: ${ICS_URL ? 'Configured' : 'Not configured'}`);
    console.log(`📋 Google Tasks: ${GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured'}`);
    
    // Perform initial data fetch only if configured
    if (ICS_URL || GOOGLE_CLIENT_ID) {
      console.log('Performing initial data fetch...');
      
      // Fetch calendar data (only if ICS_URL is configured)
      if (ICS_URL) {
        try {
          const events = await icsService.fetchAndParseEvents();
          await cacheManager.setEvents(events);
          console.log(`✅ Initial calendar fetch: ${events.length} events`);
        } catch (error) {
          console.error('❌ Initial calendar fetch failed:', error);
        }
      } else {
        console.log('⏭️  Skipping calendar fetch (ICS_URL not configured)');
      }

      // Fetch tasks data (only if Google OAuth is configured)
      if (tasksService) {
        try {
          const tasks = await tasksService.fetchTasks();
          await cacheManager.setTasks(tasks);
          console.log(`✅ Initial tasks fetch: ${tasks.length} tasks`);
        } catch (error) {
          console.error('❌ Initial tasks fetch failed:', error);
        }
      } else {
        console.log('⏭️  Skipping tasks fetch (Google OAuth not configured)');
      }
    } else {
      console.log('⏭️  Skipping initial data fetch (no configuration provided)');
      console.log('💡 Configure ICS_URL and Google OAuth credentials to enable data fetching');
    }

  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

// Start the server
start();
