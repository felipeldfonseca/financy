import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

const EXPENSE = '#c05f33';

export interface MemberSpending {
  userId: string;
  firstName: string;
  lastName: string;
  expense: number;
}

interface Props {
  members: MemberSpending[];
  currency: string;
  /** e.g. "mar–ago" or the month name — whatever the period filter says. */
  periodLabel: string;
}

/**
 * The group-only chart: who spent what in the selected period. Bars in a
 * single hue because the question is "how much" — the name on each bar is
 * the identity. Everything derives from transactions recorded in each
 * member's own name.
 */
export const MemberSpendingCard: React.FC<Props> = ({ members, currency, periodLabel }) => {
  const { t, i18n } = useTranslation('dashboard');

  if (members.length === 0) {
    return null;
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);

  const total = members.reduce((sum, member) => sum + member.expense, 0);
  const max = Math.max(...members.map((member) => member.expense), 1);

  return (
    <Card
      sx={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2.5, gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h6" fontWeight={600}>
            {t('memberSpending.title')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {periodLabel}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
          {members.map((member) => {
            const share = total > 0 ? Math.round((member.expense / total) * 100) : 0;
            return (
              <Box
                key={member.userId}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
              >
                <Typography
                  variant="body2"
                  fontWeight={600}
                  noWrap
                  sx={{ width: 92, flexShrink: 0 }}
                >
                  {member.firstName}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Box
                    sx={{
                      width: `${(member.expense / max) * 100}%`,
                      minWidth: 6,
                      height: 22,
                      borderRadius: '4px',
                      background: EXPENSE,
                    }}
                  />
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatCurrency(member.expense)}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                >
                  {share}%
                </Typography>
              </Box>
            );
          })}
        </Box>

        <Box
          sx={{
            mt: 2.5,
            pt: 1.75,
            borderTop: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {t('memberSpending.total')}
          </Typography>
          <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(total)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
