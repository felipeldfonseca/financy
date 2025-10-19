# Job Processing Architecture
## Financy Distributed Job Processing & Task Management

**Version**: 1.0  
**Last Updated**: 2025-10-19  
**Scope**: Complete job processing, task scheduling, and background worker architecture  

---

## Overview

Financy's job processing architecture handles asynchronous tasks, scheduled operations, and background processing to ensure scalable, reliable, and efficient system operations. The architecture supports both real-time and batch processing workloads with comprehensive monitoring and error handling.

### Key Components
1. **Job Queue System**: Redis-based message queuing with priority handling
2. **Worker Pools**: Horizontally scalable worker processes for different job types
3. **Scheduler**: Cron-like scheduling for recurring tasks and maintenance operations
4. **Monitoring**: Real-time job metrics, performance tracking, and alerting
5. **Retry & Dead Letter**: Intelligent retry mechanisms and failed job handling

---

## Job Processing Framework

### Job Types & Categories
```typescript
interface JobDefinition {
  job_type: JobType;
  category: JobCategory;
  priority: JobPriority;
  concurrency_limit?: number;
  timeout_seconds: number;
  retry_policy: RetryPolicy;
  resource_requirements: ResourceRequirements;
}

type JobType = 
  | 'ai_processing'
  | 'transaction_import'
  | 'notification_send'
  | 'data_export'
  | 'report_generation'
  | 'subscription_detection'
  | 'budget_analysis'
  | 'currency_conversion'
  | 'security_scan'
  | 'backup_operation'
  | 'cleanup_operation';

type JobCategory = 'real_time' | 'background' | 'scheduled' | 'maintenance';
type JobPriority = 'low' | 'normal' | 'high' | 'urgent';

const JOB_DEFINITIONS: Record<JobType, JobDefinition> = {
  ai_processing: {
    job_type: 'ai_processing',
    category: 'real_time',
    priority: 'high',
    concurrency_limit: 50,
    timeout_seconds: 30,
    retry_policy: {
      max_attempts: 3,
      backoff_strategy: 'exponential',
      initial_delay_ms: 1000,
      max_delay_ms: 10000
    },
    resource_requirements: {
      cpu_cores: 1,
      memory_mb: 512,
      gpu_required: false
    }
  },
  transaction_import: {
    job_type: 'transaction_import',
    category: 'background',
    priority: 'normal',
    concurrency_limit: 10,
    timeout_seconds: 300,
    retry_policy: {
      max_attempts: 5,
      backoff_strategy: 'linear',
      initial_delay_ms: 5000,
      max_delay_ms: 30000
    },
    resource_requirements: {
      cpu_cores: 0.5,
      memory_mb: 256,
      gpu_required: false
    }
  },
  notification_send: {
    job_type: 'notification_send',
    category: 'real_time',
    priority: 'high',
    concurrency_limit: 100,
    timeout_seconds: 10,
    retry_policy: {
      max_attempts: 3,
      backoff_strategy: 'exponential',
      initial_delay_ms: 500,
      max_delay_ms: 5000
    },
    resource_requirements: {
      cpu_cores: 0.25,
      memory_mb: 128,
      gpu_required: false
    }
  },
  data_export: {
    job_type: 'data_export',
    category: 'background',
    priority: 'normal',
    timeout_seconds: 1800,
    retry_policy: {
      max_attempts: 2,
      backoff_strategy: 'fixed',
      initial_delay_ms: 60000,
      max_delay_ms: 60000
    },
    resource_requirements: {
      cpu_cores: 2,
      memory_mb: 1024,
      gpu_required: false
    }
  },
  subscription_detection: {
    job_type: 'subscription_detection',
    category: 'scheduled',
    priority: 'normal',
    timeout_seconds: 600,
    retry_policy: {
      max_attempts: 3,
      backoff_strategy: 'exponential',
      initial_delay_ms: 10000,
      max_delay_ms: 60000
    },
    resource_requirements: {
      cpu_cores: 1,
      memory_mb: 512,
      gpu_required: false
    }
  }
};
```

### Job Payload Structure
```typescript
interface JobPayload {
  job_id: string;
  job_type: JobType;
  user_id?: string;
  context_id?: string;
  priority: JobPriority;
  scheduled_at?: Date;
  created_at: Date;
  payload: Record<string, any>;
  metadata: JobMetadata;
}

interface JobMetadata {
  source: string;
  correlation_id?: string;
  parent_job_id?: string;
  tags: string[];
  environment: 'development' | 'staging' | 'production';
  tenant_id?: string;
}

// Example job payloads
const EXAMPLE_JOBS: JobPayload[] = [
  {
    job_id: 'job_ai_001',
    job_type: 'ai_processing',
    user_id: 'usr_123456',
    context_id: 'ctx_789012',
    priority: 'high',
    created_at: new Date(),
    payload: {
      input_type: 'voice',
      audio_data: 'base64_encoded_audio',
      language: 'pt-BR',
      context_data: {
        recent_transactions: [],
        user_preferences: {}
      }
    },
    metadata: {
      source: 'telegram_webhook',
      correlation_id: 'msg_telegram_001',
      tags: ['voice_processing', 'transaction_extraction'],
      environment: 'production'
    }
  },
  {
    job_id: 'job_notif_001',
    job_type: 'notification_send',
    user_id: 'usr_123456',
    priority: 'high',
    created_at: new Date(),
    payload: {
      notification_type: 'transaction_confirmation',
      channel: 'telegram',
      recipient: {
        platform_user_id: '123456789',
        preferred_language: 'pt-BR'
      },
      content: {
        transaction_id: 'txn_abc123',
        amount: 45.50,
        merchant: 'Café Central'
      }
    },
    metadata: {
      source: 'transaction_service',
      correlation_id: 'txn_abc123',
      tags: ['notification', 'transaction'],
      environment: 'production'
    }
  }
];
```

---

## Queue Management System

### Redis Queue Configuration
```typescript
interface QueueConfig {
  name: string;
  redis_config: RedisConfig;
  priority_levels: number;
  max_length?: number;
  retention_period_hours: number;
  dead_letter_queue: boolean;
}

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  cluster_mode: boolean;
  sentinel_config?: SentinelConfig;
}

const QUEUE_CONFIGURATIONS: Record<string, QueueConfig> = {
  high_priority: {
    name: 'financy:jobs:high',
    redis_config: {
      host: 'redis-cluster.financy.internal',
      port: 6379,
      db: 0,
      cluster_mode: true
    },
    priority_levels: 3,
    max_length: 10000,
    retention_period_hours: 24,
    dead_letter_queue: true
  },
  normal_priority: {
    name: 'financy:jobs:normal',
    redis_config: {
      host: 'redis-cluster.financy.internal',
      port: 6379,
      db: 1,
      cluster_mode: true
    },
    priority_levels: 2,
    max_length: 50000,
    retention_period_hours: 72,
    dead_letter_queue: true
  },
  low_priority: {
    name: 'financy:jobs:low',
    redis_config: {
      host: 'redis-cluster.financy.internal',
      port: 6379,
      db: 2,
      cluster_mode: true
    },
    priority_levels: 1,
    retention_period_hours: 168,
    dead_letter_queue: true
  },
  scheduled: {
    name: 'financy:jobs:scheduled',
    redis_config: {
      host: 'redis-cluster.financy.internal',
      port: 6379,
      db: 3,
      cluster_mode: true
    },
    priority_levels: 1,
    retention_period_hours: 720,
    dead_letter_queue: true
  }
};
```

### Queue Manager Implementation
```typescript
class JobQueueManager {
  private redis: Redis;
  private queues: Map<string, Queue> = new Map();
  
  constructor(private config: QueueConfig[]) {
    this.initializeQueues();
  }
  
  async enqueueJob(job: JobPayload): Promise<string> {
    const queueName = this.selectQueue(job.priority, job.scheduled_at);
    const queue = this.queues.get(queueName);
    
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    // Add job metadata
    const enhancedJob = {
      ...job,
      enqueued_at: new Date(),
      attempts: 0,
      status: 'pending' as JobStatus
    };
    
    // Calculate delay for scheduled jobs
    const delay = job.scheduled_at 
      ? Math.max(0, job.scheduled_at.getTime() - Date.now())
      : 0;
    
    // Enqueue with priority and delay
    const jobId = await queue.add(
      job.job_type,
      enhancedJob,
      {
        priority: this.getPriorityScore(job.priority),
        delay,
        attempts: JOB_DEFINITIONS[job.job_type].retry_policy.max_attempts,
        backoff: {
          type: JOB_DEFINITIONS[job.job_type].retry_policy.backoff_strategy,
          delay: JOB_DEFINITIONS[job.job_type].retry_policy.initial_delay_ms
        }
      }
    );
    
    // Log job enqueue
    await this.logJobEvent(job.job_id, 'enqueued', {
      queue: queueName,
      priority: job.priority,
      scheduled_at: job.scheduled_at
    });
    
    return jobId;
  }
  
  async dequeueJob(queueName: string): Promise<Job | null> {
    const queue = this.queues.get(queueName);
    if (!queue) return null;
    
    return await queue.getWaiting()[0] || null;
  }
  
  async getQueueStats(queueName: string): Promise<QueueStats> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();
    const delayed = await queue.getDelayed();
    
    return {
      queue_name: queueName,
      waiting_count: waiting.length,
      active_count: active.length,
      completed_count: completed.length,
      failed_count: failed.length,
      delayed_count: delayed.length,
      total_processed: completed.length + failed.length,
      throughput_per_minute: await this.calculateThroughput(queueName),
      average_processing_time_ms: await this.calculateAverageProcessingTime(queueName)
    };
  }
  
  private selectQueue(priority: JobPriority, scheduledAt?: Date): string {
    if (scheduledAt && scheduledAt > new Date()) {
      return 'scheduled';
    }
    
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'high_priority';
      case 'normal':
        return 'normal_priority';
      case 'low':
        return 'low_priority';
      default:
        return 'normal_priority';
    }
  }
  
  private getPriorityScore(priority: JobPriority): number {
    switch (priority) {
      case 'urgent': return 100;
      case 'high': return 75;
      case 'normal': return 50;
      case 'low': return 25;
      default: return 50;
    }
  }
}
```

---

## Worker Pool Architecture

### Worker Configuration
```typescript
interface WorkerConfig {
  worker_type: string;
  concurrency: number;
  job_types: JobType[];
  resource_limits: ResourceLimits;
  health_check: HealthCheckConfig;
  scaling: ScalingConfig;
}

interface ResourceLimits {
  max_memory_mb: number;
  max_cpu_percent: number;
  max_processing_time_seconds: number;
}

interface HealthCheckConfig {
  enabled: boolean;
  interval_seconds: number;
  timeout_seconds: number;
  failure_threshold: number;
}

interface ScalingConfig {
  min_workers: number;
  max_workers: number;
  scale_up_threshold: number;
  scale_down_threshold: number;
  scale_up_cooldown_seconds: number;
  scale_down_cooldown_seconds: number;
}

const WORKER_CONFIGURATIONS: WorkerConfig[] = [
  {
    worker_type: 'ai_processing_worker',
    concurrency: 10,
    job_types: ['ai_processing'],
    resource_limits: {
      max_memory_mb: 1024,
      max_cpu_percent: 80,
      max_processing_time_seconds: 60
    },
    health_check: {
      enabled: true,
      interval_seconds: 30,
      timeout_seconds: 5,
      failure_threshold: 3
    },
    scaling: {
      min_workers: 2,
      max_workers: 20,
      scale_up_threshold: 80, // queue length percentage
      scale_down_threshold: 20,
      scale_up_cooldown_seconds: 300,
      scale_down_cooldown_seconds: 600
    }
  },
  {
    worker_type: 'notification_worker',
    concurrency: 50,
    job_types: ['notification_send'],
    resource_limits: {
      max_memory_mb: 256,
      max_cpu_percent: 60,
      max_processing_time_seconds: 30
    },
    health_check: {
      enabled: true,
      interval_seconds: 15,
      timeout_seconds: 3,
      failure_threshold: 5
    },
    scaling: {
      min_workers: 5,
      max_workers: 50,
      scale_up_threshold: 70,
      scale_down_threshold: 30,
      scale_up_cooldown_seconds: 180,
      scale_down_cooldown_seconds: 900
    }
  },
  {
    worker_type: 'general_worker',
    concurrency: 5,
    job_types: [
      'transaction_import',
      'data_export',
      'report_generation',
      'subscription_detection',
      'budget_analysis',
      'currency_conversion'
    ],
    resource_limits: {
      max_memory_mb: 512,
      max_cpu_percent: 70,
      max_processing_time_seconds: 1800
    },
    health_check: {
      enabled: true,
      interval_seconds: 60,
      timeout_seconds: 10,
      failure_threshold: 2
    },
    scaling: {
      min_workers: 3,
      max_workers: 15,
      scale_up_threshold: 85,
      scale_down_threshold: 25,
      scale_up_cooldown_seconds: 600,
      scale_down_cooldown_seconds: 1200
    }
  }
];
```

### Worker Implementation
```typescript
abstract class BaseWorker {
  protected workerId: string;
  protected config: WorkerConfig;
  protected isRunning: boolean = false;
  protected currentJobs: Map<string, JobExecution> = new Map();
  
  constructor(config: WorkerConfig) {
    this.workerId = `${config.worker_type}_${crypto.randomUUID()}`;
    this.config = config;
  }
  
  async start(): Promise<void> {
    this.isRunning = true;
    
    // Start health check
    this.startHealthCheck();
    
    // Start job processing loop
    this.startJobProcessing();
    
    console.log(`Worker ${this.workerId} started`);
  }
  
  async stop(): Promise<void> {
    this.isRunning = false;
    
    // Wait for current jobs to complete
    await this.waitForJobsToComplete();
    
    console.log(`Worker ${this.workerId} stopped`);
  }
  
  protected async processJob(job: Job): Promise<JobResult> {
    const startTime = Date.now();
    const execution: JobExecution = {
      job_id: job.data.job_id,
      worker_id: this.workerId,
      started_at: new Date(),
      status: 'processing'
    };
    
    this.currentJobs.set(job.data.job_id, execution);
    
    try {
      // Resource monitoring
      this.startResourceMonitoring(job.data.job_id);
      
      // Process the job
      const result = await this.executeJob(job);
      
      execution.status = 'completed';
      execution.completed_at = new Date();
      execution.result = result;
      
      // Log successful completion
      await this.logJobCompletion(job.data.job_id, result, Date.now() - startTime);
      
      return result;
      
    } catch (error) {
      execution.status = 'failed';
      execution.completed_at = new Date();
      execution.error = error.message;
      
      // Log failure
      await this.logJobFailure(job.data.job_id, error, Date.now() - startTime);
      
      throw error;
      
    } finally {
      this.stopResourceMonitoring(job.data.job_id);
      this.currentJobs.delete(job.data.job_id);
    }
  }
  
  protected abstract executeJob(job: Job): Promise<JobResult>;
  
  private async startJobProcessing(): Promise<void> {
    while (this.isRunning) {
      try {
        if (this.currentJobs.size < this.config.concurrency) {
          const job = await this.getNextJob();
          
          if (job) {
            // Process job asynchronously
            this.processJob(job).catch(error => {
              console.error(`Job processing error: ${error.message}`);
            });
          } else {
            // No jobs available, wait before checking again
            await this.sleep(1000);
          }
        } else {
          // At capacity, wait before checking again
          await this.sleep(500);
        }
      } catch (error) {
        console.error(`Worker processing error: ${error.message}`);
        await this.sleep(5000);
      }
    }
  }
  
  private async getNextJob(): Promise<Job | null> {
    for (const jobType of this.config.job_types) {
      const queueName = this.getQueueForJobType(jobType);
      const job = await this.queueManager.dequeueJob(queueName);
      
      if (job && job.data.job_type === jobType) {
        return job;
      }
    }
    
    return null;
  }
  
  private startHealthCheck(): void {
    if (!this.config.health_check.enabled) return;
    
    setInterval(async () => {
      try {
        const health = await this.checkHealth();
        await this.reportHealth(health);
      } catch (error) {
        console.error(`Health check failed: ${error.message}`);
      }
    }, this.config.health_check.interval_seconds * 1000);
  }
  
  private async checkHealth(): Promise<WorkerHealth> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = await this.getCPUUsage();
    
    return {
      worker_id: this.workerId,
      status: this.isRunning ? 'healthy' : 'stopped',
      memory_usage_mb: memoryUsage.heapUsed / 1024 / 1024,
      cpu_usage_percent: cpuUsage,
      active_jobs: this.currentJobs.size,
      last_check: new Date()
    };
  }
}

class AIProcessingWorker extends BaseWorker {
  private aiService: AIProcessingService;
  
  constructor(config: WorkerConfig, aiService: AIProcessingService) {
    super(config);
    this.aiService = aiService;
  }
  
  protected async executeJob(job: Job): Promise<JobResult> {
    const { job_type, payload } = job.data;
    
    if (job_type !== 'ai_processing') {
      throw new Error(`Invalid job type for AIProcessingWorker: ${job_type}`);
    }
    
    const result = await this.aiService.processInput(
      payload.input_type,
      payload.audio_data || payload.text_data || payload.image_data,
      payload.context_data
    );
    
    return {
      success: true,
      data: result,
      processing_time_ms: result.processing_time_ms,
      confidence_score: result.confidence
    };
  }
}

class NotificationWorker extends BaseWorker {
  private notificationService: NotificationService;
  
  constructor(config: WorkerConfig, notificationService: NotificationService) {
    super(config);
    this.notificationService = notificationService;
  }
  
  protected async executeJob(job: Job): Promise<JobResult> {
    const { job_type, payload } = job.data;
    
    if (job_type !== 'notification_send') {
      throw new Error(`Invalid job type for NotificationWorker: ${job_type}`);
    }
    
    const result = await this.notificationService.sendNotification(
      payload.notification_type,
      payload.channel,
      payload.recipient,
      payload.content
    );
    
    return {
      success: true,
      data: {
        notification_id: result.notification_id,
        delivery_status: result.status,
        delivered_at: result.delivered_at
      }
    };
  }
}
```

---

## Scheduled Jobs & Cron Tasks

### Scheduler Configuration
```typescript
interface ScheduledJob {
  job_id: string;
  name: string;
  cron_expression: string;
  job_type: JobType;
  enabled: boolean;
  timezone: string;
  max_concurrent_runs: number;
  timeout_seconds: number;
  payload_template: Record<string, any>;
  retry_policy: RetryPolicy;
  notification_settings: NotificationSettings;
}

const SCHEDULED_JOBS: ScheduledJob[] = [
  {
    job_id: 'scheduled_subscription_detection',
    name: 'Daily Subscription Detection',
    cron_expression: '0 6 * * *', // Daily at 6 AM
    job_type: 'subscription_detection',
    enabled: true,
    timezone: 'America/Sao_Paulo',
    max_concurrent_runs: 1,
    timeout_seconds: 3600,
    payload_template: {
      detection_scope: 'all_active_users',
      lookback_days: 7,
      confidence_threshold: 0.8
    },
    retry_policy: {
      max_attempts: 3,
      backoff_strategy: 'exponential',
      initial_delay_ms: 300000, // 5 minutes
      max_delay_ms: 1800000 // 30 minutes
    },
    notification_settings: {
      on_success: ['operations_team'],
      on_failure: ['operations_team', 'engineering_team'],
      on_timeout: ['engineering_team']
    }
  },
  {
    job_id: 'scheduled_budget_analysis',
    name: 'Weekly Budget Analysis',
    cron_expression: '0 8 * * 1', // Every Monday at 8 AM
    job_type: 'budget_analysis',
    enabled: true,
    timezone: 'America/Sao_Paulo',
    max_concurrent_runs: 5,
    timeout_seconds: 1800,
    payload_template: {
      analysis_type: 'weekly_summary',
      include_projections: true,
      notification_enabled: true
    },
    retry_policy: {
      max_attempts: 2,
      backoff_strategy: 'fixed',
      initial_delay_ms: 600000, // 10 minutes
      max_delay_ms: 600000
    },
    notification_settings: {
      on_success: ['analytics_team'],
      on_failure: ['analytics_team', 'engineering_team'],
      on_timeout: ['engineering_team']
    }
  },
  {
    job_id: 'scheduled_currency_update',
    name: 'Currency Exchange Rate Update',
    cron_expression: '*/15 * * * *', // Every 15 minutes
    job_type: 'currency_conversion',
    enabled: true,
    timezone: 'UTC',
    max_concurrent_runs: 1,
    timeout_seconds: 300,
    payload_template: {
      operation: 'fetch_latest_rates',
      currencies: ['BRL', 'USD', 'EUR', 'GBP'],
      force_refresh: false
    },
    retry_policy: {
      max_attempts: 5,
      backoff_strategy: 'linear',
      initial_delay_ms: 60000, // 1 minute
      max_delay_ms: 300000 // 5 minutes
    },
    notification_settings: {
      on_success: [],
      on_failure: ['finance_team'],
      on_timeout: ['engineering_team']
    }
  },
  {
    job_id: 'scheduled_data_cleanup',
    name: 'Daily Data Cleanup',
    cron_expression: '0 2 * * *', // Daily at 2 AM
    job_type: 'cleanup_operation',
    enabled: true,
    timezone: 'America/Sao_Paulo',
    max_concurrent_runs: 1,
    timeout_seconds: 7200,
    payload_template: {
      cleanup_scope: ['expired_sessions', 'old_logs', 'temp_files'],
      retention_policies: {
        session_data: '7d',
        application_logs: '90d',
        temp_files: '24h'
      }
    },
    retry_policy: {
      max_attempts: 3,
      backoff_strategy: 'exponential',
      initial_delay_ms: 1800000, // 30 minutes
      max_delay_ms: 3600000 // 1 hour
    },
    notification_settings: {
      on_success: [],
      on_failure: ['operations_team'],
      on_timeout: ['operations_team']
    }
  },
  {
    job_id: 'scheduled_security_scan',
    name: 'Nightly Security Scan',
    cron_expression: '0 3 * * *', // Daily at 3 AM
    job_type: 'security_scan',
    enabled: true,
    timezone: 'America/Sao_Paulo',
    max_concurrent_runs: 1,
    timeout_seconds: 5400,
    payload_template: {
      scan_type: 'comprehensive',
      targets: ['application', 'infrastructure', 'dependencies'],
      report_format: 'json'
    },
    retry_policy: {
      max_attempts: 2,
      backoff_strategy: 'fixed',
      initial_delay_ms: 3600000, // 1 hour
      max_delay_ms: 3600000
    },
    notification_settings: {
      on_success: ['security_team'],
      on_failure: ['security_team', 'engineering_team'],
      on_timeout: ['security_team']
    }
  }
];
```

### Scheduler Implementation
```typescript
class JobScheduler {
  private cronJobs: Map<string, ScheduledTask> = new Map();
  private queueManager: JobQueueManager;
  
  constructor(queueManager: JobQueueManager) {
    this.queueManager = queueManager;
  }
  
  async initialize(): Promise<void> {
    for (const scheduledJob of SCHEDULED_JOBS) {
      if (scheduledJob.enabled) {
        await this.scheduleJob(scheduledJob);
      }
    }
    
    console.log(`Initialized ${this.cronJobs.size} scheduled jobs`);
  }
  
  private async scheduleJob(scheduledJob: ScheduledJob): Promise<void> {
    const cronTask = cron.schedule(
      scheduledJob.cron_expression,
      async () => {
        await this.executeScheduledJob(scheduledJob);
      },
      {
        scheduled: true,
        timezone: scheduledJob.timezone
      }
    );
    
    this.cronJobs.set(scheduledJob.job_id, {
      scheduled_job: scheduledJob,
      cron_task: cronTask,
      last_execution: null,
      next_execution: cronTask.nextDate(),
      execution_count: 0,
      failure_count: 0
    });
    
    console.log(`Scheduled job: ${scheduledJob.name} (${scheduledJob.cron_expression})`);
  }
  
  private async executeScheduledJob(scheduledJob: ScheduledJob): Promise<void> {
    const task = this.cronJobs.get(scheduledJob.job_id);
    if (!task) return;
    
    // Check concurrent run limit
    const runningJobs = await this.getRunningJobsCount(scheduledJob.job_id);
    if (runningJobs >= scheduledJob.max_concurrent_runs) {
      console.warn(`Skipping scheduled job ${scheduledJob.name} - concurrent limit reached`);
      return;
    }
    
    const jobPayload: JobPayload = {
      job_id: `${scheduledJob.job_id}_${Date.now()}`,
      job_type: scheduledJob.job_type,
      priority: 'normal',
      created_at: new Date(),
      payload: {
        ...scheduledJob.payload_template,
        scheduled_job_id: scheduledJob.job_id,
        execution_time: new Date()
      },
      metadata: {
        source: 'scheduler',
        tags: ['scheduled', scheduledJob.job_id],
        environment: process.env.NODE_ENV as any
      }
    };
    
    try {
      await this.queueManager.enqueueJob(jobPayload);
      
      task.last_execution = new Date();
      task.execution_count++;
      
      console.log(`Executed scheduled job: ${scheduledJob.name}`);
      
    } catch (error) {
      task.failure_count++;
      
      console.error(`Failed to execute scheduled job ${scheduledJob.name}:`, error);
      
      // Send failure notification
      await this.sendNotification(scheduledJob, 'failure', error.message);
    }
  }
  
  async getScheduleStatus(): Promise<ScheduleStatus[]> {
    const status: ScheduleStatus[] = [];
    
    for (const [jobId, task] of this.cronJobs) {
      status.push({
        job_id: jobId,
        job_name: task.scheduled_job.name,
        enabled: task.scheduled_job.enabled,
        cron_expression: task.scheduled_job.cron_expression,
        last_execution: task.last_execution,
        next_execution: task.next_execution,
        execution_count: task.execution_count,
        failure_count: task.failure_count,
        success_rate: task.execution_count > 0 
          ? ((task.execution_count - task.failure_count) / task.execution_count) * 100 
          : 0
      });
    }
    
    return status;
  }
  
  async pauseScheduledJob(jobId: string): Promise<void> {
    const task = this.cronJobs.get(jobId);
    if (!task) {
      throw new Error(`Scheduled job ${jobId} not found`);
    }
    
    task.cron_task.stop();
    task.scheduled_job.enabled = false;
    
    console.log(`Paused scheduled job: ${task.scheduled_job.name}`);
  }
  
  async resumeScheduledJob(jobId: string): Promise<void> {
    const task = this.cronJobs.get(jobId);
    if (!task) {
      throw new Error(`Scheduled job ${jobId} not found`);
    }
    
    task.cron_task.start();
    task.scheduled_job.enabled = true;
    
    console.log(`Resumed scheduled job: ${task.scheduled_job.name}`);
  }
}
```

This comprehensive job processing architecture provides Financy with robust, scalable, and reliable background task processing capabilities, ensuring efficient handling of AI processing, notifications, data operations, and scheduled maintenance tasks.