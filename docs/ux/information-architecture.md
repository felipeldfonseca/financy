# Information Architecture
## Financy System Structure & Organization

**Version**: 1.0  
**Last Updated**: 2025-10-18  
**Scope**: Complete information architecture for conversational and dashboard interfaces  

---

## Architecture Overview

### Core Organizational Principles
1. **Context-First Design**: All information organized around financial contexts (personal, family, projects)
2. **Temporal Organization**: Time-based primary navigation with category-based secondary filtering
3. **Progressive Disclosure**: Essential information first, detailed views on demand
4. **Multi-Modal Consistency**: Same information structure across chat and dashboard interfaces

### Primary Information Hierarchies
- **Context Hierarchy**: Personal → Shared → Project/Temporary
- **Temporal Hierarchy**: Recent → Current Period → Historical → Future Projections
- **Transaction Hierarchy**: Individual → Grouped → Categorized → Summarized
- **Content Hierarchy**: Essential → Important → Supplementary → Administrative

---

## Context Architecture

### Context Types & Structure

#### Personal Context
**Structure**: Private financial space for individual user
```
Personal Context
├── Current Activity
│   ├── Recent Transactions (last 7 days)
│   ├── Pending Actions (corrections needed)
│   └── Today's Spending Summary
├── Monthly Overview
│   ├── Current Month Progress
│   ├── Category Breakdowns
│   └── Budget vs Actual
├── Recurring Items
│   ├── Active Subscriptions
│   ├── Installment Plans
│   └── Scheduled Payments
└── Historical Data
    ├── Previous Months
    ├── Yearly Trends
    └── Category Evolution
```

**Access Pattern**: Always available, default landing space
**Navigation**: Home icon, "Meu Financeiro" in Portuguese UI
**Privacy**: Completely private, never shared

#### Shared/Family Context
**Structure**: Collaborative financial space with permissions
```
Family Context
├── Shared Dashboard
│   ├── Combined Activity Feed
│   ├── Member Contributions
│   └── Shared Goals Progress
├── Expense Management
│   ├── Pending Approvals (if roles configured)
│   ├── Split Calculations
│   └── Settlement Status
├── Shared Subscriptions
│   ├── Family Plan Services
│   ├── Household Bills
│   └── Shared Installments
└── Family Planning
    ├── Budget Allocations
    ├── Savings Goals
    └── Major Purchase Planning
```

**Access Pattern**: Secondary navigation, context switcher
**Navigation**: Family icon, context name display
**Privacy**: Visible to all context members based on roles

#### Project/Temporary Context
**Structure**: Event-specific financial tracking
```
Project Context (e.g., "Portugal Trip")
├── Event Overview
│   ├── Total Budget vs Spent
│   ├── Participant Summary
│   └── Timeline View
├── Expense Categories
│   ├── Transportation
│   ├── Accommodation
│   ├── Food & Entertainment
│   └── Individual Purchases
├── Settlement Management
│   ├── Who Owes What
│   ├── Payment Status
│   └── Final Reconciliation
└── Event Completion
    ├── Final Report
    ├── Export Options
    └── Archive/Delete Context
```

**Access Pattern**: Temporary prominence during active events
**Navigation**: Project icon, contextual activation
**Privacy**: Visible to invited participants only

---

## Navigation Architecture

### Primary Navigation Structure

#### Conversational Interface (Telegram/WhatsApp)
**Navigation Pattern**: Command-based with natural language fallback
```
Bot Commands Structure
├── Quick Actions
│   ├── /add [expense] - Quick expense entry
│   ├── /summary - Current period overview
│   ├── /switch [context] - Change active context
│   └── /help - Contextual assistance
├── Context Management
│   ├── /personal - Switch to personal context
│   ├── /family - Switch to family context
│   ├── /create [context] - New context creation
│   └── /invite [context] - Member invitation
├── Information Requests
│   ├── /spending [period] - Spending analysis
│   ├── /budget - Budget status
│   ├── /subscriptions - Recurring payments
│   └── /upcoming - Future payments
└── Settings & Support
    ├── /settings - Preference management
    ├── /export - Data export
    ├── /privacy - Privacy controls
    └── /support - Help system
```

#### Dashboard Interface (Web)
**Navigation Pattern**: Tab-based with contextual sidebars
```
Dashboard Navigation
├── Top-Level Tabs
│   ├── Overview (Home)
│   ├── Transactions
│   ├── Analytics
│   ├── Planning
│   └── Settings
├── Context Switcher (Always Visible)
│   ├── Personal Context
│   ├── Family Context(s)
│   ├── Project Context(s)
│   └── + Create New Context
├── Time Period Selector
│   ├── This Month
│   ├── Last Month
│   ├── This Year
│   ├── Custom Range
│   └── All Time
└── Secondary Actions
    ├── Export Data
    ├── Help & Support
    ├── Account Settings
    └── Logout
```

### Navigation Patterns by User Type

#### Beginner User (Weeks 1-4)
**Simplified Navigation**:
- Single context (personal) visible
- Essential features only (add expense, view summary)
- Progressive feature revelation based on usage
- Guided tours for new sections

#### Intermediate User (Months 2-6)
**Expanded Navigation**:
- Multiple contexts available
- Advanced filtering and analysis tools
- Custom categories and tags
- Export and sharing capabilities

#### Power User (6+ months)
**Full Navigation**:
- All features accessible
- Keyboard shortcuts enabled
- Bulk operations available
- API access and integrations

---

## Content Organization

### Transaction Information Hierarchy

#### Individual Transaction View
```
Transaction Details
├── Primary Information
│   ├── Amount (prominent)
│   ├── Description/Merchant
│   ├── Date & Time
│   └── Category (editable)
├── Secondary Information
│   ├── Payment Method
│   ├── Context Assignment
│   ├── Tags (if any)
│   └── Notes/Comments
├── Metadata
│   ├── Input Method (text/voice/image)
│   ├── Confidence Score (if auto-processed)
│   ├── Creation Timestamp
│   └── Last Modified
└── Related Information
    ├── Linked Subscription (if applicable)
    ├── Installment Info (if applicable)
    ├── Split Details (if shared)
    └── Attachments (receipts, photos)
```

#### Transaction List Views
**Default List View**:
- Amount (right-aligned)
- Description (truncated if needed)
- Category icon + name
- Date (relative: "today", "yesterday", specific date)
- Context indicator (if multiple contexts)

**Compact List View**:
- Amount + description on single line
- Category and date on secondary line
- Minimal visual elements for high density

**Card View**:
- Full transaction details in card format
- Thumbnail of receipt if available
- Action buttons (edit, categorize, split)

### Category Organization

#### Standard Category Taxonomy
```
Financy Category Structure
├── Essential Categories
│   ├── 🏠 Moradia (Housing)
│   │   ├── Aluguel/Financiamento
│   │   ├── Condomínio
│   │   ├── Utilidades (água, luz, gás)
│   │   └── Manutenção
│   ├── 🍽️ Alimentação (Food)
│   │   ├── Supermercado
│   │   ├── Restaurantes
│   │   ├── Delivery
│   │   └── Cafés/Lanches
│   ├── 🚗 Transporte (Transportation)
│   │   ├── Combustível
│   │   ├── Transporte Público
│   │   ├── Aplicativos (Uber/99)
│   │   └── Manutenção Veículo
│   └── 🏥 Saúde (Health)
│       ├── Plano de Saúde
│       ├── Medicamentos
│       ├── Consultas
│       └── Exames
├── Lifestyle Categories
│   ├── 🎬 Entretenimento (Entertainment)
│   ├── 👕 Roupas/Acessórios (Clothing)
│   ├── 💄 Beleza/Cuidados (Beauty/Care)
│   └── 🎓 Educação (Education)
├── Financial Categories
│   ├── 💳 Cartão de Crédito (Credit Card)
│   ├── 💰 Investimentos (Investments)
│   ├── 🏦 Taxas Bancárias (Bank Fees)
│   └── 💸 Transferências (Transfers)
└── Custom Categories
    ├── User-Defined Categories
    ├── Context-Specific Categories
    └── Temporary/Project Categories
```

#### Category Customization Rules
- **Personal Context**: Full customization allowed
- **Shared Context**: Changes require appropriate permissions
- **Project Context**: Temporary categories auto-archived when context closes
- **Category Inheritance**: Shared contexts can inherit personal category preferences

---

## Search & Discovery Architecture

### Search Functionality

#### Global Search
**Search Scope**: All accessible contexts and time periods
**Search Fields**:
- Transaction descriptions
- Merchant names
- Category names
- Tag values
- Notes/comments
- Amount ranges

**Search Syntax**:
```
Search Query Examples
├── Simple Text: "netflix" → finds all Netflix transactions
├── Amount Range: "50-100" → transactions between R$50-100
├── Category: "categoria:alimentação" → all food expenses
├── Date Range: "dezembro" → all December transactions
├── Context: "contexto:família" → family context only
└── Combined: "netflix categoria:entretenimento dezembro"
```

#### Smart Filters
**Pre-defined Filter Sets**:
- Recent activity (last 7 days)
- Large expenses (top 10% by amount)
- Uncategorized transactions
- Pending corrections
- Subscription payments
- Shared expenses needing settlement

#### Contextual Search
**Context-Aware Results**:
- Search within current context by default
- Option to expand to all accessible contexts
- Recent searches saved per context
- Suggested searches based on current view

---

## Dashboard Information Architecture

### Overview Dashboard Layout

#### Primary Information Zones
```
Dashboard Layout (Desktop)
├── Header Zone
│   ├── Context Switcher (left)
│   ├── Time Period Selector (center)
│   ├── Search Bar (center-right)
│   └── User Menu (right)
├── Main Content Zone
│   ├── Key Metrics Cards (top row)
│   │   ├── Current Month Spending
│   │   ├── Budget Progress
│   │   ├── Pending Actions
│   │   └── Next Payment Due
│   ├── Primary Chart Area (center)
│   │   ├── Spending Trends
│   │   ├── Category Breakdown
│   │   └── Budget vs Actual
│   └── Recent Activity (bottom)
│       ├── Latest Transactions
│       ├── Recent Context Activity
│       └── System Notifications
├── Sidebar Zone (Contextual)
│   ├── Quick Actions
│   ├── Context Information
│   ├── Upcoming Events
│   └── Help & Tips
└── Footer Zone
    ├── Context Status
    ├── Sync Information
    └── Support Links
```

#### Mobile Dashboard Adaptation
```
Mobile Layout (Responsive)
├── Sticky Header
│   ├── Context Name
│   ├── Period Selector (collapsed)
│   └── Menu Toggle
├── Swipeable Card Stack
│   ├── Summary Card
│   ├── Chart Card
│   ├── Recent Transactions Card
│   └── Quick Actions Card
├── Bottom Navigation
│   ├── Overview
│   ├── Add Expense
│   ├── Transactions
│   ├── Analytics
│   └── Settings
└── Floating Action Button
    └── Quick Add Expense
```

### Analytics & Reporting Architecture

#### Report Types & Structure
```
Reporting Hierarchy
├── Standard Reports
│   ├── Monthly Summary
│   │   ├── Income vs Expenses
│   │   ├── Category Breakdown
│   │   ├── Trend Comparison
│   │   └── Goal Progress
│   ├── Category Analysis
│   │   ├── Top Categories by Amount
│   │   ├── Category Trends Over Time
│   │   ├── Unusual Spending Patterns
│   │   └── Category Budget Performance
│   └── Cash Flow Projection
│       ├── Upcoming Subscriptions
│       ├── Installment Schedule
│       ├── Recurring Bill Forecast
│       └── Net Cash Flow Prediction
├── Collaborative Reports
│   ├── Family Spending Summary
│   ├── Shared Expense Analysis
│   ├── Member Contribution Analysis
│   └── Joint Goal Progress
└── Custom Reports
    ├── User-Defined Time Periods
    ├── Custom Category Groupings
    ├── Multi-Context Comparisons
    └── Export-Ready Formats
```

---

## Localization Architecture

### Multi-Language Information Structure

#### Language Support Levels
**Primary Languages**:
- Portuguese (Brazil) - Native support with regional financial terms
- English (US) - Full feature support with USD currency
- Spanish (Mexico) - Planned for V1.5 with MXN currency

#### Localized Content Architecture
```
Localization Structure
├── Interface Text
│   ├── Navigation Labels
│   ├── Button Text
│   ├── Form Labels
│   └── System Messages
├── Financial Terminology
│   ├── Category Names (localized)
│   ├── Currency Formatting
│   ├── Payment Method Terms
│   └── Financial Institutions
├── Cultural Adaptations
│   ├── Date Formats (DD/MM/YYYY vs MM/DD/YYYY)
│   ├── Number Formats (1.234,56 vs 1,234.56)
│   ├── Address Formats
│   └── Phone Number Formats
└── Conversational Patterns
    ├── Natural Language Processing Rules
    ├── Common Expense Descriptions
    ├── Cultural Payment Terms
    └── Regional Merchant Names
```

---

## Error & Empty States Architecture

### Error State Information Design

#### Error Categories & Information Hierarchy
```
Error State Structure
├── System Errors
│   ├── Connection Issues
│   │   ├── Clear Status Message
│   │   ├── Expected Resolution Time
│   │   ├── Offline Capability Info
│   │   └── Retry Action
│   ├── Processing Errors
│   │   ├── Error Description
│   │   ├── Data That Was Saved
│   │   ├── Manual Correction Options
│   │   └── Support Contact
│   └── Authentication Errors
│       ├── Session Status
│       ├── Re-authentication Steps
│       ├── Data Security Notice
│       └── Help Resources
├── User Input Errors
│   ├── Parsing Failures
│   │   ├── What Was Understood
│   │   ├── Suggested Corrections
│   │   ├── Example Formats
│   │   └── Manual Entry Option
│   ├── Validation Errors
│   │   ├── Field-Specific Messages
│   │   ├── Acceptable Value Ranges
│   │   ├── Format Requirements
│   │   └── Example Inputs
│   └── Permission Errors
│       ├── Access Level Explanation
│       ├── Required Permission Level
│       ├── Request Access Option
│       └── Alternative Actions
└── Data State Errors
    ├── Missing Information
    ├── Conflicting Data
    ├── Outdated Information
    └── Synchronization Issues
```

### Empty State Information Design

#### Empty State Types & Content Strategy
```
Empty State Architecture
├── Onboarding Empty States
│   ├── Welcome Message
│   ├── Getting Started Guide
│   ├── Sample Data Option
│   └── First Action Prompt
├── Temporary Empty States
│   ├── Current Filter Results
│   │   ├── Filter Summary
│   │   ├── Suggestion to Modify Filters
│   │   ├── Clear Filter Option
│   │   └── Browse All Data Option
│   ├── Time Period Empty
│   │   ├── Period Confirmation
│   │   ├── Add Expense Prompt
│   │   ├── Previous Period Data
│   │   └── Change Period Option
│   └── Context Empty
│       ├── Context Information
│       ├── Add First Expense
│       ├── Import Data Option
│       └── Context Settings
└── Informational Empty States
    ├── Feature Not Available
    │   ├── Feature Description
    │   ├── Availability Timeline
    │   ├── Alternative Solutions
    │   └── Notification Signup
    ├── Subscription Required
    │   ├── Feature Benefits
    │   ├── Plan Comparison
    │   ├── Upgrade Options
    │   └── Trial Information
    └── Maintenance Mode
        ├── Status Information
        ├── Expected Duration
        ├── Alternative Access
        └── Status Updates
```

---

## Accessibility Information Architecture

### Accessible Navigation Structure

#### Screen Reader Navigation
- **Landmark Regions**: Header, navigation, main content, sidebar, footer
- **Heading Hierarchy**: Logical H1-H6 structure with no skipped levels
- **Skip Links**: "Skip to main content", "Skip to navigation"
- **Focus Management**: Logical tab order, visible focus indicators

#### Keyboard Navigation Patterns
```
Keyboard Navigation Structure
├── Global Shortcuts
│   ├── Alt+1: Go to Overview
│   ├── Alt+2: Go to Transactions
│   ├── Alt+3: Go to Analytics
│   ├── Alt+S: Open Search
│   └── Alt+H: Open Help
├── Context Shortcuts
│   ├── Ctrl+1: Personal Context
│   ├── Ctrl+2: Family Context
│   ├── Ctrl+N: New Context
│   └── Ctrl+T: Switch Context
├── Data Entry Shortcuts
│   ├── Ctrl+Enter: Quick Add Expense
│   ├── Tab: Navigate Form Fields
│   ├── Space: Activate Buttons
│   └── Escape: Cancel/Close
└── List Navigation
    ├── Arrow Keys: Navigate Items
    ├── Enter: Open/Edit Item
    ├── Delete: Remove Item
    └── F2: Rename/Edit
```

#### Information Density Options
- **High Contrast Mode**: Enhanced color contrast for visual clarity
- **Large Text Mode**: Increased font sizes with maintained layout
- **Simplified Layout**: Reduced visual complexity with essential elements only
- **Focus Indicators**: Enhanced focus visibility for keyboard navigation

---

## Performance & Technical Architecture

### Information Loading Strategy

#### Progressive Loading Patterns
```
Data Loading Architecture
├── Critical Path (< 1 second)
│   ├── User Authentication State
│   ├── Current Context Information
│   ├── Basic Navigation Structure
│   └── Essential CSS/JS
├── Primary Content (< 2 seconds)
│   ├── Current Period Summary
│   ├── Recent Transactions (last 10)
│   ├── Key Metrics
│   └── Navigation Functionality
├── Secondary Content (< 5 seconds)
│   ├── Historical Data
│   ├── Analytics Charts
│   ├── Advanced Features
│   └── Non-critical Integrations
└── Background Loading
    ├── Full Transaction History
    ├── Advanced Analytics Data
    ├── Cached Report Generation
    └── Predictive Data Prefetch
```

#### Caching Strategy
- **Static Content**: Long-term caching for UI assets
- **User Data**: Smart caching with real-time updates
- **Analytics**: Cached with refresh triggers
- **Context Data**: Per-context caching with invalidation

This information architecture provides a comprehensive structure for organizing all financial data and user interactions across both conversational and dashboard interfaces, ensuring consistency, accessibility, and optimal user experience.