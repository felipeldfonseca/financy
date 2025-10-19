# Reporting System
## Financy Advanced Reporting & Data Export Platform

**Version**: 1.0  
**Last Updated**: 2025-10-19  
**Scope**: Complete reporting engine, scheduled reports, and data export capabilities  

---

## Overview

Financy's reporting system provides comprehensive data analysis, automated report generation, and flexible export capabilities. The platform serves both end-users seeking financial insights and administrators requiring business intelligence and operational reports.

### Key Features
1. **Automated Reports**: Scheduled generation of financial summaries and analytics
2. **Custom Report Builder**: Drag-and-drop interface for creating tailored reports
3. **Multi-Format Export**: PDF, Excel, CSV, and interactive web reports
4. **Real-Time Data**: Live report generation with current data
5. **Collaborative Sharing**: Report distribution and collaborative analysis

---

## Report Types & Categories

### Report Classification System
```typescript
interface ReportDefinition {
  report_type: ReportType;
  category: ReportCategory;
  target_audience: TargetAudience;
  data_sources: DataSource[];
  generation_complexity: GenerationComplexity;
  refresh_frequency: RefreshFrequency;
  export_formats: ExportFormat[];
  sharing_capabilities: SharingCapability[];
}

type ReportType = 
  | 'monthly_financial_summary'
  | 'quarterly_expense_analysis'
  | 'annual_spending_report'
  | 'budget_performance_review'
  | 'category_deep_dive'
  | 'subscription_analysis'
  | 'cash_flow_statement'
  | 'comparative_period_analysis'
  | 'goal_tracking_report'
  | 'context_member_analysis'
  | 'platform_usage_analytics'
  | 'security_audit_report'
  | 'compliance_report'
  | 'financial_health_assessment';

type ReportCategory = 'personal' | 'context' | 'administrative' | 'compliance' | 'analytical';
type TargetAudience = 'end_user' | 'context_admin' | 'platform_admin' | 'external_stakeholder';
type GenerationComplexity = 'simple' | 'moderate' | 'complex' | 'advanced';
type RefreshFrequency = 'real_time' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'on_demand';

const REPORT_DEFINITIONS: Record<ReportType, ReportDefinition> = {
  monthly_financial_summary: {
    report_type: 'monthly_financial_summary',
    category: 'personal',
    target_audience: 'end_user',
    data_sources: [
      { source: 'transactions', time_range: 'current_month' },
      { source: 'budgets', time_range: 'current_month' },
      { source: 'categories', time_range: 'all' },
      { source: 'ai_insights', time_range: 'current_month' }
    ],
    generation_complexity: 'moderate',
    refresh_frequency: 'daily',
    export_formats: ['PDF', 'Excel', 'Web'],
    sharing_capabilities: ['email', 'download', 'view_link']
  },
  quarterly_expense_analysis: {
    report_type: 'quarterly_expense_analysis',
    category: 'analytical',
    target_audience: 'end_user',
    data_sources: [
      { source: 'transactions', time_range: 'current_quarter' },
      { source: 'transactions', time_range: 'previous_quarter' },
      { source: 'budget_performance', time_range: 'current_quarter' },
      { source: 'market_benchmarks', time_range: 'current_quarter' }
    ],
    generation_complexity: 'complex',
    refresh_frequency: 'weekly',
    export_formats: ['PDF', 'Excel', 'PowerPoint'],
    sharing_capabilities: ['email', 'download', 'collaborative_view']
  },
  context_member_analysis: {
    report_type: 'context_member_analysis',
    category: 'context',
    target_audience: 'context_admin',
    data_sources: [
      { source: 'member_transactions', time_range: 'configurable' },
      { source: 'split_transactions', time_range: 'configurable' },
      { source: 'member_activity', time_range: 'configurable' },
      { source: 'budget_contributions', time_range: 'configurable' }
    ],
    generation_complexity: 'complex',
    refresh_frequency: 'on_demand',
    export_formats: ['PDF', 'Excel', 'CSV'],
    sharing_capabilities: ['email', 'download', 'member_restricted_view']
  },
  platform_usage_analytics: {
    report_type: 'platform_usage_analytics',
    category: 'administrative',
    target_audience: 'platform_admin',
    data_sources: [
      { source: 'user_activity_events', time_range: 'configurable' },
      { source: 'feature_usage_metrics', time_range: 'configurable' },
      { source: 'performance_metrics', time_range: 'configurable' },
      { source: 'error_logs', time_range: 'configurable' }
    ],
    generation_complexity: 'advanced',
    refresh_frequency: 'hourly',
    export_formats: ['PDF', 'Excel', 'JSON', 'Dashboard'],
    sharing_capabilities: ['internal_dashboard', 'executive_summary']
  }
};
```

### Report Templates
```typescript
interface ReportTemplate {
  template_id: string;
  template_name: string;
  description: string;
  report_type: ReportType;
  layout_configuration: LayoutConfiguration;
  sections: ReportSection[];
  styling: ReportStyling;
  localization: LocalizationConfig;
}

interface ReportSection {
  section_id: string;
  section_type: SectionType;
  title: string;
  data_query: DataQuery;
  visualization: VisualizationConfig;
  content_template: ContentTemplate;
  conditional_rendering: ConditionalRendering;
}

type SectionType = 
  | 'executive_summary'
  | 'key_metrics'
  | 'trend_analysis'
  | 'category_breakdown'
  | 'comparative_analysis'
  | 'insights_recommendations'
  | 'detailed_transactions'
  | 'appendix'
  | 'methodology';

const MONTHLY_SUMMARY_TEMPLATE: ReportTemplate = {
  template_id: 'monthly_financial_summary_v2',
  template_name: 'Monthly Financial Summary',
  description: 'Comprehensive monthly financial overview with insights and recommendations',
  report_type: 'monthly_financial_summary',
  layout_configuration: {
    page_format: 'A4',
    orientation: 'portrait',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    header_footer: true,
    page_numbers: true,
    table_of_contents: true
  },
  sections: [
    {
      section_id: 'executive_summary',
      section_type: 'executive_summary',
      title: 'Executive Summary',
      data_query: {
        aggregations: [
          'total_spending',
          'budget_performance',
          'category_distribution',
          'month_over_month_change'
        ],
        filters: {
          time_range: 'current_month',
          context_id: '{{report_context_id}}'
        }
      },
      visualization: {
        type: 'summary_cards',
        layout: 'grid_2x2',
        color_scheme: 'financy_primary'
      },
      content_template: {
        format: 'structured_text',
        template: `
          Durante {{month_name}}, você gastou {{total_spending_formatted}} em {{context_name}}.
          
          {{#if budget_performance.on_track}}
          ✅ Seus gastos estão dentro do orçamento planejado ({{budget_performance.percentage_used}}% utilizado).
          {{else}}
          ⚠️ Você ultrapassou o orçamento em {{budget_performance.overage_amount_formatted}}.
          {{/if}}
          
          Suas principais categorias de gasto foram:
          {{#each top_categories}}
          • {{name}}: {{amount_formatted}} ({{percentage}}%)
          {{/each}}
        `
      },
      conditional_rendering: {
        show_if: 'has_transactions',
        hide_if_empty: true
      }
    },
    {
      section_id: 'spending_trends',
      section_type: 'trend_analysis',
      title: 'Spending Trends',
      data_query: {
        time_series: {
          metric: 'daily_spending',
          time_range: 'last_6_months',
          granularity: 'daily'
        },
        comparative_periods: ['previous_month', 'same_month_last_year']
      },
      visualization: {
        type: 'line_chart',
        show_trend_line: true,
        show_annotations: true,
        height: 300
      },
      content_template: {
        format: 'chart_with_commentary',
        template: `
          Análise de tendências dos últimos 6 meses:
          
          {{#if trend_analysis.increasing}}
          📈 Seus gastos têm tendência de crescimento ({{trend_analysis.growth_rate}}% ao mês).
          {{else if trend_analysis.decreasing}}
          📉 Seus gastos têm tendência de redução ({{trend_analysis.reduction_rate}}% ao mês).
          {{else}}
          ➡️ Seus gastos mantêm-se estáveis com pequenas variações.
          {{/if}}
          
          {{#if anomalies}}
          Eventos atípicos identificados:
          {{#each anomalies}}
          • {{date}}: {{description}} ({{amount_formatted}})
          {{/each}}
          {{/if}}
        `
      },
      conditional_rendering: {
        show_if: 'has_historical_data',
        minimum_data_points: 30
      }
    },
    {
      section_id: 'category_breakdown',
      section_type: 'category_breakdown',
      title: 'Category Analysis',
      data_query: {
        grouping: 'category',
        aggregations: ['sum', 'count', 'avg'],
        include_subcategories: true,
        budget_comparison: true
      },
      visualization: {
        type: 'treemap',
        color_by: 'amount',
        show_percentages: true,
        interactive: false
      },
      content_template: {
        format: 'table_with_charts',
        table_columns: [
          'category_name',
          'amount',
          'percentage',
          'budget_variance',
          'transaction_count'
        ],
        template: `
          Breakdown detalhado por categoria:
          
          {{category_analysis_table}}
          
          {{#if budget_variances}}
          📊 Análise de orçamento:
          {{#each budget_variances}}
          • {{category}}: {{variance_formatted}} ({{variance_percentage}}%)
          {{/each}}
          {{/if}}
        `
      },
      conditional_rendering: {
        show_if: 'has_categories',
        hide_if_empty: false
      }
    },
    {
      section_id: 'ai_insights',
      section_type: 'insights_recommendations',
      title: 'Insights & Recommendations',
      data_query: {
        ai_analysis: {
          insight_types: ['spending_patterns', 'optimization_opportunities', 'behavioral_insights'],
          confidence_threshold: 0.7
        }
      },
      visualization: {
        type: 'insight_cards',
        layout: 'vertical_list',
        show_confidence: false
      },
      content_template: {
        format: 'ai_generated_content',
        template: `
          🤖 Insights personalizados baseados em IA:
          
          {{#each ai_insights}}
          {{#if high_confidence}}
          ⭐ **{{title}}**
          {{insight_text}}
          
          {{#if actionable_recommendation}}
          💡 Recomendação: {{recommendation_text}}
          {{/if}}
          {{/if}}
          {{/each}}
          
          {{#if savings_opportunities}}
          💰 Oportunidades de economia identificadas:
          {{#each savings_opportunities}}
          • {{description}}: até {{potential_savings_formatted}} por mês
          {{/each}}
          {{/if}}
        `
      },
      conditional_rendering: {
        show_if: 'has_ai_insights',
        minimum_insights: 1
      }
    }
  ],
  styling: {
    color_palette: {
      primary: '#2563EB',
      secondary: '#64748B',
      accent: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444'
    },
    typography: {
      heading_font: 'Inter, sans-serif',
      body_font: 'Inter, sans-serif',
      heading_sizes: {
        h1: '24px',
        h2: '20px',
        h3: '16px'
      }
    },
    branding: {
      logo_url: '/assets/financy-logo.png',
      logo_position: 'header_left',
      company_colors: true
    }
  },
  localization: {
    default_language: 'pt-BR',
    supported_languages: ['pt-BR', 'en-US'],
    currency_formatting: 'locale_based',
    date_formatting: 'locale_based',
    number_formatting: 'locale_based'
  }
};
```

---

## Report Generation Engine

### Generation Pipeline
```typescript
interface ReportGenerationPipeline {
  pipeline_id: string;
  stages: ProcessingStage[];
  parallelization: ParallelizationConfig;
  error_handling: ErrorHandlingConfig;
  performance_optimization: PerformanceConfig;
}

interface ProcessingStage {
  stage_name: string;
  stage_type: StageType;
  dependencies: string[];
  timeout_seconds: number;
  retry_policy: RetryPolicy;
  resources: ResourceRequirements;
}

type StageType = 
  | 'data_extraction'
  | 'data_transformation'
  | 'ai_analysis'
  | 'visualization_generation'
  | 'content_compilation'
  | 'format_conversion'
  | 'quality_validation'
  | 'delivery_preparation';

const REPORT_GENERATION_PIPELINE: ReportGenerationPipeline = {
  pipeline_id: 'comprehensive_report_generation',
  stages: [
    {
      stage_name: 'data_extraction',
      stage_type: 'data_extraction',
      dependencies: [],
      timeout_seconds: 60,
      retry_policy: {
        max_attempts: 3,
        backoff_strategy: 'exponential'
      },
      resources: {
        cpu_cores: 1,
        memory_mb: 512,
        io_intensive: true
      }
    },
    {
      stage_name: 'data_transformation',
      stage_type: 'data_transformation',
      dependencies: ['data_extraction'],
      timeout_seconds: 120,
      retry_policy: {
        max_attempts: 2,
        backoff_strategy: 'linear'
      },
      resources: {
        cpu_cores: 2,
        memory_mb: 1024,
        io_intensive: false
      }
    },
    {
      stage_name: 'ai_insights_generation',
      stage_type: 'ai_analysis',
      dependencies: ['data_transformation'],
      timeout_seconds: 300,
      retry_policy: {
        max_attempts: 2,
        backoff_strategy: 'exponential'
      },
      resources: {
        cpu_cores: 2,
        memory_mb: 2048,
        gpu_required: false
      }
    },
    {
      stage_name: 'visualization_creation',
      stage_type: 'visualization_generation',
      dependencies: ['data_transformation'],
      timeout_seconds: 180,
      retry_policy: {
        max_attempts: 3,
        backoff_strategy: 'fixed'
      },
      resources: {
        cpu_cores: 1,
        memory_mb: 1024,
        headless_browser: true
      }
    },
    {
      stage_name: 'content_assembly',
      stage_type: 'content_compilation',
      dependencies: ['ai_insights_generation', 'visualization_creation'],
      timeout_seconds: 240,
      retry_policy: {
        max_attempts: 2,
        backoff_strategy: 'linear'
      },
      resources: {
        cpu_cores: 1,
        memory_mb: 512,
        template_engine: true
      }
    },
    {
      stage_name: 'pdf_generation',
      stage_type: 'format_conversion',
      dependencies: ['content_assembly'],
      timeout_seconds: 120,
      retry_policy: {
        max_attempts: 3,
        backoff_strategy: 'exponential'
      },
      resources: {
        cpu_cores: 1,
        memory_mb: 1024,
        headless_browser: true
      }
    },
    {
      stage_name: 'quality_check',
      stage_type: 'quality_validation',
      dependencies: ['pdf_generation'],
      timeout_seconds: 60,
      retry_policy: {
        max_attempts: 1,
        backoff_strategy: 'none'
      },
      resources: {
        cpu_cores: 1,
        memory_mb: 256,
        file_validation: true
      }
    }
  ],
  parallelization: {
    max_concurrent_stages: 3,
    resource_pooling: true,
    stage_priority: {
      'data_extraction': 'high',
      'ai_insights_generation': 'medium',
      'visualization_creation': 'medium',
      'pdf_generation': 'high'
    }
  },
  error_handling: {
    failure_strategy: 'partial_degradation',
    fallback_templates: true,
    error_notification: true,
    manual_intervention_threshold: 2
  },
  performance_optimization: {
    caching_enabled: true,
    incremental_processing: true,
    resource_preallocation: true,
    concurrent_user_limit: 50
  }
};
```

### Report Generator Service
```typescript
class ReportGeneratorService {
  private pipelineExecutor: PipelineExecutor;
  private templateEngine: TemplateEngine;
  private visualizationEngine: VisualizationEngine;
  private aiInsightsService: AIInsightsService;
  
  async generateReport(request: ReportGenerationRequest): Promise<GeneratedReport> {
    // Create generation job
    const job = await this.createGenerationJob(request);
    
    // Execute pipeline
    const pipelineResult = await this.pipelineExecutor.execute(
      REPORT_GENERATION_PIPELINE,
      {
        report_template: request.template,
        data_parameters: request.parameters,
        output_formats: request.formats,
        user_context: request.user_context
      }
    );
    
    // Package results
    const generatedReport = await this.packageReport(job, pipelineResult);
    
    // Store and track
    await this.storeReport(generatedReport);
    await this.updateGenerationMetrics(job, pipelineResult);
    
    return generatedReport;
  }
  
  private async executeDataExtraction(
    template: ReportTemplate,
    parameters: ReportParameters
  ): Promise<ExtractedData> {
    
    const extractedData: ExtractedData = {
      datasets: new Map(),
      metadata: {
        extraction_timestamp: new Date(),
        data_freshness: new Map(),
        quality_scores: new Map()
      }
    };
    
    // Extract data for each section
    for (const section of template.sections) {
      const sectionData = await this.extractSectionData(section, parameters);
      extractedData.datasets.set(section.section_id, sectionData);
      
      // Validate data quality
      const qualityScore = await this.validateDataQuality(sectionData);
      extractedData.metadata.quality_scores.set(section.section_id, qualityScore);
    }
    
    return extractedData;
  }
  
  private async executeDataTransformation(
    extractedData: ExtractedData,
    template: ReportTemplate
  ): Promise<TransformedData> {
    
    const transformedData: TransformedData = {
      processed_datasets: new Map(),
      aggregations: new Map(),
      derived_metrics: new Map()
    };
    
    for (const [sectionId, rawData] of extractedData.datasets) {
      const section = template.sections.find(s => s.section_id === sectionId);
      if (!section) continue;
      
      // Apply transformations based on section requirements
      const processed = await this.applyDataTransformations(rawData, section.data_query);
      transformedData.processed_datasets.set(sectionId, processed);
      
      // Calculate aggregations
      const aggregations = await this.calculateAggregations(processed, section.data_query);
      transformedData.aggregations.set(sectionId, aggregations);
      
      // Derive additional metrics
      const metrics = await this.deriveMet`rics(processed, aggregations);
      transformedData.derived_metrics.set(sectionId, metrics);
    }
    
    return transformedData;
  }
  
  private async generateAIInsights(
    transformedData: TransformedData,
    userContext: UserContext
  ): Promise<AIInsights> {
    
    const insights: AIInsights = {
      spending_patterns: [],
      optimization_opportunities: [],
      behavioral_insights: [],
      recommendations: [],
      confidence_scores: new Map()
    };
    
    // Analyze spending patterns
    const spendingPatterns = await this.aiInsightsService.analyzeSpendingPatterns(
      transformedData.processed_datasets.get('spending_data'),
      userContext
    );
    insights.spending_patterns = spendingPatterns;
    
    // Identify optimization opportunities
    const optimizations = await this.aiInsightsService.identifyOptimizations(
      transformedData.aggregations,
      userContext.budget_data
    );
    insights.optimization_opportunities = optimizations;
    
    // Generate behavioral insights
    const behavioral = await this.aiInsightsService.analyzeBehavior(
      transformedData.processed_datasets,
      userContext.historical_behavior
    );
    insights.behavioral_insights = behavioral;
    
    // Create actionable recommendations
    const recommendations = await this.aiInsightsService.generateRecommendations(
      insights.spending_patterns,
      insights.optimization_opportunities,
      userContext.preferences
    );
    insights.recommendations = recommendations;
    
    return insights;
  }
  
  private async generateVisualizations(
    transformedData: TransformedData,
    template: ReportTemplate
  ): Promise<GeneratedVisualizations> {
    
    const visualizations: GeneratedVisualizations = {
      charts: new Map(),
      tables: new Map(),
      infographics: new Map()
    };
    
    for (const section of template.sections) {
      if (!section.visualization) continue;
      
      const sectionData = transformedData.processed_datasets.get(section.section_id);
      if (!sectionData) continue;
      
      switch (section.visualization.type) {
        case 'line_chart':
          const lineChart = await this.visualizationEngine.createLineChart(
            sectionData,
            section.visualization
          );
          visualizations.charts.set(`${section.section_id}_chart`, lineChart);
          break;
          
        case 'treemap':
          const treemap = await this.visualizationEngine.createTreemap(
            sectionData,
            section.visualization
          );
          visualizations.charts.set(`${section.section_id}_treemap`, treemap);
          break;
          
        case 'summary_cards':
          const cards = await this.visualizationEngine.createSummaryCards(
            sectionData,
            section.visualization
          );
          visualizations.infographics.set(`${section.section_id}_cards`, cards);
          break;
          
        case 'table_with_charts':
          const table = await this.visualizationEngine.createTable(
            sectionData,
            section.content_template.table_columns
          );
          visualizations.tables.set(`${section.section_id}_table`, table);
          break;
      }
    }
    
    return visualizations;
  }
  
  private async compileContent(
    transformedData: TransformedData,
    aiInsights: AIInsights,
    visualizations: GeneratedVisualizations,
    template: ReportTemplate
  ): Promise<CompiledContent> {
    
    const compiledContent: CompiledContent = {
      sections: new Map(),
      metadata: {
        generation_time: new Date(),
        template_version: template.template_id,
        data_coverage: this.calculateDataCoverage(transformedData)
      }
    };
    
    for (const section of template.sections) {
      // Prepare template variables
      const templateVariables = await this.prepareTemplateVariables(
        section,
        transformedData,
        aiInsights,
        visualizations
      );
      
      // Render content
      const renderedContent = await this.templateEngine.render(
        section.content_template.template,
        templateVariables
      );
      
      // Apply conditional rendering
      const shouldRender = await this.evaluateConditionalRendering(
        section.conditional_rendering,
        templateVariables
      );
      
      if (shouldRender) {
        compiledContent.sections.set(section.section_id, {
          title: section.title,
          content: renderedContent,
          visualization_refs: this.getVisualizationRefs(section, visualizations),
          metadata: {
            section_type: section.section_type,
            data_quality_score: transformedData.quality_scores?.get(section.section_id) || 1.0
          }
        });
      }
    }
    
    return compiledContent;
  }
  
  private async convertToFormats(
    compiledContent: CompiledContent,
    requestedFormats: ExportFormat[],
    template: ReportTemplate
  ): Promise<FormattedOutputs> {
    
    const outputs: FormattedOutputs = {
      pdf: null,
      excel: null,
      csv: null,
      web: null,
      powerpoint: null
    };
    
    for (const format of requestedFormats) {
      switch (format) {
        case 'PDF':
          outputs.pdf = await this.generatePDF(compiledContent, template);
          break;
          
        case 'Excel':
          outputs.excel = await this.generateExcel(compiledContent, template);
          break;
          
        case 'CSV':
          outputs.csv = await this.generateCSV(compiledContent, template);
          break;
          
        case 'Web':
          outputs.web = await this.generateWebReport(compiledContent, template);
          break;
          
        case 'PowerPoint':
          outputs.powerpoint = await this.generatePowerPoint(compiledContent, template);
          break;
      }
    }
    
    return outputs;
  }
}
```

---

## Scheduled Reports & Automation

### Automated Report Scheduling
```typescript
interface ScheduledReport {
  schedule_id: string;
  report_template: string;
  schedule_config: ScheduleConfiguration;
  recipients: ReportRecipient[];
  generation_parameters: ReportParameters;
  delivery_settings: DeliverySettings;
  active: boolean;
  last_generated: Date;
  next_generation: Date;
}

interface ScheduleConfiguration {
  frequency: ScheduleFrequency;
  timing: TimingConfig;
  timezone: string;
  business_days_only: boolean;
  skip_holidays: boolean;
  custom_calendar?: string;
}

interface ReportRecipient {
  recipient_id: string;
  recipient_type: 'user' | 'email' | 'webhook' | 'file_storage';
  delivery_address: string;
  permissions: RecipientPermissions;
  personalization: RecipientPersonalization;
}

type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'custom_cron';

const SCHEDULED_REPORTS: ScheduledReport[] = [
  {
    schedule_id: 'monthly_personal_summary',
    report_template: 'monthly_financial_summary_v2',
    schedule_config: {
      frequency: 'monthly',
      timing: {
        day_of_month: 1,
        hour: 9,
        minute: 0
      },
      timezone: 'America/Sao_Paulo',
      business_days_only: true,
      skip_holidays: true
    },
    recipients: [
      {
        recipient_id: 'user_self',
        recipient_type: 'user',
        delivery_address: '{{user_email}}',
        permissions: {
          can_view: true,
          can_download: true,
          can_share: false
        },
        personalization: {
          language: '{{user_language}}',
          currency: '{{user_currency}}',
          timezone: '{{user_timezone}}'
        }
      }
    ],
    generation_parameters: {
      time_range: 'previous_month',
      context_ids: ['{{user_personal_context}}'],
      include_ai_insights: true,
      detail_level: 'comprehensive'
    },
    delivery_settings: {
      email_subject: 'Seu Resumo Financeiro de {{month_name}}',
      email_template: 'monthly_summary_email',
      attach_pdf: true,
      include_web_link: true,
      retention_days: 90
    },
    active: true,
    last_generated: new Date('2025-10-01T09:00:00Z'),
    next_generation: new Date('2025-11-01T09:00:00Z')
  },
  {
    schedule_id: 'quarterly_context_review',
    report_template: 'quarterly_expense_analysis',
    schedule_config: {
      frequency: 'quarterly',
      timing: {
        day_of_quarter: 5, // 5th day of the quarter
        hour: 8,
        minute: 0
      },
      timezone: 'America/Sao_Paulo',
      business_days_only: true,
      skip_holidays: false
    },
    recipients: [
      {
        recipient_id: 'context_admins',
        recipient_type: 'user',
        delivery_address: '{{context_admin_emails}}',
        permissions: {
          can_view: true,
          can_download: true,
          can_share: true
        },
        personalization: {
          language: 'pt-BR',
          currency: '{{context_currency}}',
          timezone: 'America/Sao_Paulo'
        }
      }
    ],
    generation_parameters: {
      time_range: 'previous_quarter',
      context_ids: ['{{user_admin_contexts}}'],
      include_member_analysis: true,
      include_benchmarks: true,
      detail_level: 'executive'
    },
    delivery_settings: {
      email_subject: 'Análise Trimestral - {{context_name}} ({{quarter}} {{year}})',
      email_template: 'quarterly_analysis_email',
      attach_pdf: true,
      attach_excel: true,
      include_web_link: true,
      retention_days: 365
    },
    active: true,
    last_generated: new Date('2025-10-05T08:00:00Z'),
    next_generation: new Date('2026-01-05T08:00:00Z')
  },
  {
    schedule_id: 'weekly_platform_metrics',
    report_template: 'platform_usage_analytics',
    schedule_config: {
      frequency: 'weekly',
      timing: {
        day_of_week: 1, // Monday
        hour: 6,
        minute: 0
      },
      timezone: 'UTC',
      business_days_only: false,
      skip_holidays: false
    },
    recipients: [
      {
        recipient_id: 'executive_team',
        recipient_type: 'email',
        delivery_address: 'executives@financy.com',
        permissions: {
          can_view: true,
          can_download: true,
          can_share: false
        },
        personalization: {
          language: 'pt-BR',
          currency: 'BRL',
          timezone: 'America/Sao_Paulo'
        }
      },
      {
        recipient_id: 'analytics_dashboard',
        recipient_type: 'webhook',
        delivery_address: 'https://analytics.financy.com/api/reports/ingest',
        permissions: {
          can_view: true,
          can_download: false,
          can_share: false
        },
        personalization: {
          language: 'en-US',
          currency: 'USD',
          timezone: 'UTC'
        }
      }
    ],
    generation_parameters: {
      time_range: 'previous_week',
      include_user_metrics: true,
      include_performance_metrics: true,
      include_financial_metrics: true,
      detail_level: 'executive'
    },
    delivery_settings: {
      email_subject: 'Weekly Platform Analytics - Week {{week_number}}, {{year}}',
      email_template: 'platform_analytics_email',
      attach_pdf: true,
      webhook_format: 'json',
      retention_days: 180
    },
    active: true,
    last_generated: new Date('2025-10-14T06:00:00Z'),
    next_generation: new Date('2025-10-21T06:00:00Z')
  }
];
```

### Report Scheduler Service
```typescript
class ReportSchedulerService {
  private cronJobs: Map<string, ScheduledTask> = new Map();
  private reportGenerator: ReportGeneratorService;
  private deliveryService: ReportDeliveryService;
  
  async initializeSchedules(): Promise<void> {
    for (const scheduledReport of SCHEDULED_REPORTS) {
      if (scheduledReport.active) {
        await this.scheduleReport(scheduledReport);
      }
    }
    
    console.log(`Initialized ${this.cronJobs.size} scheduled reports`);
  }
  
  private async scheduleReport(scheduledReport: ScheduledReport): Promise<void> {
    const cronExpression = this.buildCronExpression(scheduledReport.schedule_config);
    
    const cronTask = cron.schedule(
      cronExpression,
      async () => {
        await this.executeScheduledReport(scheduledReport);
      },
      {
        scheduled: true,
        timezone: scheduledReport.schedule_config.timezone
      }
    );
    
    this.cronJobs.set(scheduledReport.schedule_id, {
      scheduled_report: scheduledReport,
      cron_task: cronTask,
      last_execution: scheduledReport.last_generated,
      next_execution: cronTask.nextDate(),
      execution_count: 0,
      failure_count: 0
    });
  }
  
  private async executeScheduledReport(scheduledReport: ScheduledReport): Promise<void> {
    const executionId = `${scheduledReport.schedule_id}_${Date.now()}`;
    
    try {
      console.log(`Executing scheduled report: ${scheduledReport.schedule_id}`);
      
      // Check if should skip (holidays, business days, etc.)
      if (await this.shouldSkipExecution(scheduledReport)) {
        console.log(`Skipping execution due to schedule constraints`);
        return;
      }
      
      // Generate report for each recipient (with personalization)
      const reportResults: GeneratedReport[] = [];
      
      for (const recipient of scheduledReport.recipients) {
        const personalizedParameters = await this.personalizeParameters(
          scheduledReport.generation_parameters,
          recipient
        );
        
        const generationRequest: ReportGenerationRequest = {
          template_id: scheduledReport.report_template,
          parameters: personalizedParameters,
          formats: this.getRequiredFormats(scheduledReport.delivery_settings),
          user_context: await this.buildUserContext(recipient),
          execution_context: {
            scheduled: true,
            execution_id: executionId,
            recipient_id: recipient.recipient_id
          }
        };
        
        const generatedReport = await this.reportGenerator.generateReport(generationRequest);
        reportResults.push(generatedReport);
      }
      
      // Deliver reports
      for (let i = 0; i < reportResults.length; i++) {
        const report = reportResults[i];
        const recipient = scheduledReport.recipients[i];
        
        await this.deliveryService.deliverReport(
          report,
          recipient,
          scheduledReport.delivery_settings
        );
      }
      
      // Update execution tracking
      await this.updateExecutionStatus(scheduledReport.schedule_id, 'success', {
        execution_id: executionId,
        generated_reports: reportResults.length,
        execution_time: new Date()
      });
      
      console.log(`Successfully executed scheduled report: ${scheduledReport.schedule_id}`);
      
    } catch (error) {
      console.error(`Failed to execute scheduled report ${scheduledReport.schedule_id}:`, error);
      
      await this.updateExecutionStatus(scheduledReport.schedule_id, 'failed', {
        execution_id: executionId,
        error_message: error.message,
        execution_time: new Date()
      });
      
      // Send failure notification
      await this.sendExecutionFailureNotification(scheduledReport, error);
    }
  }
  
  private buildCronExpression(config: ScheduleConfiguration): string {
    switch (config.frequency) {
      case 'daily':
        return `${config.timing.minute} ${config.timing.hour} * * *`;
        
      case 'weekly':
        return `${config.timing.minute} ${config.timing.hour} * * ${config.timing.day_of_week}`;
        
      case 'monthly':
        return `${config.timing.minute} ${config.timing.hour} ${config.timing.day_of_month} * *`;
        
      case 'quarterly':
        // Run on specific day of the first month of each quarter
        const quarterMonths = '1,4,7,10'; // Jan, Apr, Jul, Oct
        return `${config.timing.minute} ${config.timing.hour} ${config.timing.day_of_quarter} ${quarterMonths} *`;
        
      case 'annually':
        return `${config.timing.minute} ${config.timing.hour} ${config.timing.day_of_month} ${config.timing.month} *`;
        
      case 'custom_cron':
        return config.timing.cron_expression;
        
      default:
        throw new Error(`Unsupported schedule frequency: ${config.frequency}`);
    }
  }
  
  private async shouldSkipExecution(scheduledReport: ScheduledReport): Promise<boolean> {
    const now = new Date();
    const config = scheduledReport.schedule_config;
    
    // Check business days only
    if (config.business_days_only) {
      const dayOfWeek = now.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
        return true;
      }
    }
    
    // Check holidays
    if (config.skip_holidays && config.custom_calendar) {
      const isHoliday = await this.checkHoliday(now, config.custom_calendar);
      if (isHoliday) {
        return true;
      }
    }
    
    return false;
  }
  
  async getScheduleStatus(): Promise<ScheduleStatus[]> {
    const statuses: ScheduleStatus[] = [];
    
    for (const [scheduleId, task] of this.cronJobs) {
      const executionHistory = await this.getExecutionHistory(scheduleId, 10);
      
      statuses.push({
        schedule_id: scheduleId,
        report_name: task.scheduled_report.report_template,
        active: task.scheduled_report.active,
        last_execution: task.last_execution,
        next_execution: task.next_execution,
        execution_count: task.execution_count,
        failure_count: task.failure_count,
        success_rate: task.execution_count > 0 
          ? ((task.execution_count - task.failure_count) / task.execution_count) * 100 
          : 0,
        recent_executions: executionHistory
      });
    }
    
    return statuses;
  }
}
```

This comprehensive reporting system provides Financy with powerful automated report generation, flexible scheduling, and multi-format delivery capabilities, enabling users and administrators to access detailed financial insights and business intelligence.