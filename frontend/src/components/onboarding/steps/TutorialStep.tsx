import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Dashboard as DashboardIcon,
  Group as GroupIcon,
  Repeat as RepeatIcon,
  AccountBalance as BudgetIcon,
} from '@mui/icons-material';

const TutorialStep: React.FC = () => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Quick Tutorial
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Here's everything you can do with Financy
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ChatIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Track Income & Expenses
                </Typography>
              </Box>
              <List dense>
                <ListItem disablePadding>
                  <ListItemText
                    primary="Via Telegram bot"
                    secondary="Send messages, voice, or photos to log transactions"
                  />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText
                    primary="Via web dashboard"
                    secondary="Add income, expenses, and transfers easily"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DashboardIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Financial Insights
                </Typography>
              </Box>
              <List dense>
                <ListItem disablePadding>
                  <ListItemText
                    primary="Income vs expenses trends"
                    secondary="Visualize your cash flow over time"
                  />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText
                    primary="Category breakdown"
                    secondary="See where your money comes from and goes"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BudgetIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Budget & Goals
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Set budgets by category, track financial goals, and monitor your progress toward savings targets.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <RepeatIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Recurring Transactions
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Track subscriptions, bills, and recurring income. Project your future cash flow with confidence.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', color: 'primary.contrastText' }}>
          <GroupIcon sx={{ mr: 1 }} />
          <strong>Coming Soon: Shared Groups - Track joint expenses and split bills automatically with family, friends, business partners, or teams</strong>
        </Typography>
      </Box>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Chip label="Voice input via Telegram" size="small" />
        <Chip label="Receipt scanning with AI" size="small" />
        <Chip label="Multi-currency support" size="small" />
        <Chip label="Automated categorization" size="small" />
      </Box>
    </Box>
  );
};

export default TutorialStep;
