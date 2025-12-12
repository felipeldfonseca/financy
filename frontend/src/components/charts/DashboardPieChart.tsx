import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  useTheme
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useDashboardCategories } from '../../hooks/useDashboardCategories';
import { Transaction } from '../../services/transactionApi';

interface DashboardPieChartProps {
  transactions: Transaction[];
  type: 'expense' | 'income' | 'transfer';
  title?: string;
  showLegend?: boolean;
  showList?: boolean;
}

export const DashboardPieChart: React.FC<DashboardPieChartProps> = ({
  transactions,
  type,
  title,
  showLegend = true,
  showList = false
}) => {
  const { t } = useTranslation('transactions');
  const theme = useTheme();
  const { getPieChartData, getDashboardCategoryTotalsWithNames } = useDashboardCategories();

  // Filter transactions by type
  const filteredTransactions = transactions.filter(tx => tx.type === type);
  
  // Get pie chart data
  const chartData = getPieChartData(filteredTransactions, type);
  
  // Get category totals for list view
  const categoryTotals = getDashboardCategoryTotalsWithNames(filteredTransactions, type);
  
  // Calculate total amount for percentage calculations
  const totalAmount = categoryTotals.reduce((sum, item) => sum + item.total, 0);

  // Custom tooltip for the pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / totalAmount) * 100).toFixed(1);
      
      return (
        <Box
          sx={{
            backgroundColor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            p: 1,
            boxShadow: theme.shadows[3]
          }}
        >
          <Typography variant="body2" fontWeight="medium">
            {data.payload.label}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(data.value)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {percentage}% do total
          </Typography>
        </Box>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title || t(`dashboardCategories.${type}.title`, `${type} Categories`)}
          </Typography>
          <Box 
            display="flex" 
            alignItems="center" 
            justifyContent="center" 
            minHeight={200}
          >
            <Typography variant="body2" color="text.secondary">
              {t('charts.noData', 'No data available')}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title || t(`form.type.${type}`, type)}
        </Typography>
        
        <Box sx={{ height: 300, width: '100%' }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              {showLegend && (
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </Box>

        {showList && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('charts.breakdown', 'Breakdown')}
            </Typography>
            <List dense>
              {categoryTotals
                .filter(item => item.total > 0)
                .sort((a, b) => b.total - a.total)
                .map((item, index) => {
                  const percentage = ((item.total / totalAmount) * 100).toFixed(1);
                  return (
                    <ListItem key={item.key} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 20 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: chartData.find(d => d.id === item.key)?.color || '#ccc'
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.name}
                        secondary={new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(item.total)}
                      />
                      <Chip 
                        label={`${percentage}%`} 
                        size="small" 
                        variant="outlined"
                      />
                    </ListItem>
                  );
                })}
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};