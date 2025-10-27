import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Dashboard as DashboardIcon,
  Category as CategoryIcon,
  TrendingUp as TrendingUpIcon,
  Group as GroupIcon,
  Repeat as RepeatIcon,
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
                  Track Expenses
                </Typography>
              </Box>
              <List dense>
                <ListItem disablePadding>
                  <ListItemText
                    primary="Via Telegram bot"
                    secondary="Just send a message, voice, or photo"
                  />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText
                    primary="Via web dashboard"
                    secondary="Click 'Add Transaction' button"
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
                  View Insights
                </Typography>
              </Box>
              <List dense>
                <ListItem disablePadding>
                  <ListItemText
                    primary="Monthly trends"
                    secondary="See spending patterns over time"
                  />
                </ListItem>
                <ListItem disablePadding>
                  <ListItemText
                    primary="Category breakdown"
                    secondary="Know where your money goes"
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
                <CategoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Smart Categories
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Transactions are automatically categorized. You can also create custom categories and subcategories.
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
                  Recurring Expenses
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Track subscriptions and installments. See how much you'll spend in coming months.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', color: 'primary.contrastText' }}>
          <GroupIcon sx={{ mr: 1 }} />
          <strong>Coming Soon:</strong>&nbsp;Family contexts to share expenses with loved ones
        </Typography>
      </Box>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Chip label="Multi-currency support" size="small" />
        <Chip label="Crypto tracking" size="small" />
        <Chip label="Voice input" size="small" />
        <Chip label="Receipt scanning" size="small" />
      </Box>
    </Box>
  );
};

export default TutorialStep;
