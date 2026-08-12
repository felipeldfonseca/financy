import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  PriorityHighRounded as OverdueGlyph,
  TaskAlt as PaidIcon,
  WarningAmberRounded as OverdueIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { CalendarDay, Transaction, transactionApi } from '../../services/transactionApi';
import { Bill } from '../../services/billApi';
import {
  buildMonthGrid,
  heatBackground,
  monthLabel,
  weekdayInitials,
  INCOME_POLE,
  EXPENSE_POLE,
} from '../../utils/calendar';
import { isBillOverdue, localTodayIso, parseLocalDate } from '../../utils/bills';

const TODAY_RING = '#45b8d7'; // brand accent: UI state, never data
const OVERDUE_INK = '#b45309';

interface Props {
  viewMonth: Date;
  onMonthChange: (next: Date) => void;
  days: CalendarDay[];
  monthBills: Bill[];
  isLoading: boolean;
  contextId?: string;
  currency: string;
}

export const CalendarHeatmapCard: React.FC<Props> = ({
  viewMonth,
  onMonthChange,
  days,
  monthBills,
  isLoading,
  contextId,
  currency,
}) => {
  const { t, i18n } = useTranslation('planning');
  const locale = i18n.language;

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayTransactions, setDayTransactions] = useState<Transaction[]>([]);
  const [dayLoading, setDayLoading] = useState(false);

  const today = localTodayIso();
  const year = viewMonth.getFullYear();
  const monthNumber = viewMonth.getMonth() + 1;

  const weeks = useMemo(() => buildMonthGrid(year, monthNumber), [year, monthNumber]);
  const initials = useMemo(() => weekdayInitials(locale), [locale]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    days.forEach((day) => map.set(day.date, day));
    return map;
  }, [days]);

  const billsByDate = useMemo(() => {
    const map = new Map<string, Bill[]>();
    monthBills.forEach((bill) => {
      const key = bill.dueDate.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), bill]);
    });
    return map;
  }, [monthBills]);

  const maxAbs = useMemo(
    () => Math.max(0, ...days.map((day) => Math.abs(day.income - day.expense))),
    [days],
  );

  // A day selected in July means nothing once the view is August.
  useEffect(() => {
    setSelectedDay(null);
    setDayTransactions([]);
  }, [year, monthNumber, contextId]);

  useEffect(() => {
    if (!selectedDay) return;
    let cancelled = false;

    const load = async () => {
      setDayLoading(true);
      try {
        const page = await transactionApi.getTransactions({
          startDate: selectedDay,
          endDate: selectedDay,
          contextId,
          limit: 100,
          sortBy: 'createdAt',
          sortOrder: 'ASC',
        });
        if (!cancelled) setDayTransactions(page.transactions);
      } catch {
        if (!cancelled) setDayTransactions([]);
      } finally {
        if (!cancelled) setDayLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedDay, contextId]);

  const formatCurrency = (amount: number, currencyCode = currency) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(amount);

  const dayTooltip = (isoDate: string): string => {
    const summary = byDate.get(isoDate);
    const dueBills = billsByDate.get(isoDate) ?? [];
    const parts: string[] = [];
    if (summary) {
      parts.push(t('calendar.tooltipCount', { count: summary.count }));
      if (summary.income > 0) parts.push(`+${formatCurrency(summary.income)}`);
      if (summary.expense > 0) parts.push(`−${formatCurrency(summary.expense)}`);
    }
    if (dueBills.length > 0) {
      parts.push(t('calendar.tooltipBills', { count: dueBills.length }));
    }
    return parts.join(' · ');
  };

  const selectedBills = selectedDay ? billsByDate.get(selectedDay) ?? [] : [];
  const selectedSummary = selectedDay ? byDate.get(selectedDay) : undefined;

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
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <CalendarIcon sx={{ fontSize: 32, color: TODAY_RING }} />
          <Typography variant="h5" fontWeight={600} sx={{ flex: 1 }}>
            {t('calendar.title')}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => onMonthChange(new Date(year, monthNumber - 2, 1))}
              aria-label={t('calendar.previousMonth') as string}
            >
              <PrevIcon />
            </IconButton>
            <Typography fontWeight={600} sx={{ minWidth: 150, textAlign: 'center' }}>
              {monthLabel(viewMonth, locale)}
            </Typography>
            <IconButton
              size="small"
              onClick={() => onMonthChange(new Date(year, monthNumber, 1))}
              aria-label={t('calendar.nextMonth') as string}
            >
              <NextIcon />
            </IconButton>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '6px',
                    mb: 1,
                  }}
                >
                  {initials.map((initial, index) => (
                    <Typography
                      key={`${initial}-${index}`}
                      variant="caption"
                      color="text.secondary"
                      sx={{ textAlign: 'center', fontWeight: 700 }}
                    >
                      {initial}
                    </Typography>
                  ))}
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                  {weeks.flat().map((isoDate, index) => {
                    if (!isoDate) {
                      return <Box key={`pad-${index}`} sx={{ aspectRatio: '1 / 1', maxHeight: 64 }} />;
                    }

                    const summary = byDate.get(isoDate);
                    const net = summary ? summary.income - summary.expense : 0;
                    const dueBills = billsByDate.get(isoDate) ?? [];
                    const openDue = dueBills.filter((bill) => bill.status === 'open');
                    const hasOverdue = isoDate < today && openDue.length > 0;
                    const isToday = isoDate === today;
                    const isFuture = isoDate > today;
                    const isSelected = isoDate === selectedDay;
                    const tooltip = dayTooltip(isoDate);

                    const cell = (
                      <Box
                        onClick={() => setSelectedDay(isoDate)}
                        role="button"
                        aria-label={isoDate}
                        sx={{
                          aspectRatio: '1 / 1',
                          maxHeight: 64,
                          borderRadius: '10px',
                          position: 'relative',
                          cursor: 'pointer',
                          background: heatBackground(net, maxAbs) ?? 'rgba(0,0,0,0.03)',
                          border: hasOverdue
                            ? `2px solid ${OVERDUE_INK}`
                            : isSelected
                              ? '2px solid rgba(0,0,0,0.55)'
                              : isToday
                                ? `2px solid ${TODAY_RING}`
                                : isFuture
                                  ? '1px dashed rgba(0,0,0,0.2)'
                                  : '1px solid rgba(0,0,0,0.06)',
                          transition: 'transform 0.15s ease',
                          '&:hover': { transform: 'scale(1.06)' },
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            position: 'absolute',
                            top: 3,
                            left: 6,
                            fontWeight: isToday ? 800 : 500,
                            color: 'text.primary',
                          }}
                        >
                          {Number(isoDate.slice(8, 10))}
                        </Typography>

                        {hasOverdue && (
                          <OverdueGlyph
                            sx={{ position: 'absolute', top: 2, right: 2, fontSize: 13, color: OVERDUE_INK }}
                          />
                        )}

                        {openDue.length > 0 && !hasOverdue && (
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 5,
                              left: 0,
                              right: 0,
                              display: 'flex',
                              justifyContent: 'center',
                              gap: '3px',
                            }}
                          >
                            {openDue.slice(0, 3).map((bill) => (
                              <Box
                                key={bill.id}
                                sx={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: '50%',
                                  backgroundColor: OVERDUE_INK,
                                }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    );

                    return tooltip ? (
                      <Tooltip key={isoDate} title={tooltip} arrow>
                        {cell}
                      </Tooltip>
                    ) : (
                      <React.Fragment key={isoDate}>{cell}</React.Fragment>
                    );
                  })}
                </Box>

                {/* Legend: every state carries text, never colour alone. */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    mt: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      − {t('calendar.legendExpense')}
                    </Typography>
                    <Box
                      sx={{
                        width: 90,
                        height: 10,
                        borderRadius: '5px',
                        background: `linear-gradient(90deg, ${EXPENSE_POLE} 0%, rgba(0,0,0,0.04) 50%, ${INCOME_POLE} 100%)`,
                        border: '1px solid rgba(0,0,0,0.08)',
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      + {t('calendar.legendIncome')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: OVERDUE_INK }} />
                    <Typography variant="caption" color="text.secondary">
                      {t('calendar.legendUpcoming')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <OverdueGlyph sx={{ fontSize: 13, color: OVERDUE_INK }} />
                    <Typography variant="caption" color="text.secondary">
                      {t('calendar.legendOverdue')}
                    </Typography>
                  </Box>
                </Box>
              </>
            )}
          </Grid>

          <Grid item xs={12} lg={4}>
            <Divider sx={{ display: { xs: 'block', lg: 'none' }, mb: 2 }} />
            {!selectedDay ? (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  minHeight: 180,
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 240 }}>
                  {t('calendar.selectDayHint')}
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography fontWeight={700} sx={{ mb: 1.5 }}>
                  {parseLocalDate(selectedDay).toLocaleDateString(locale, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </Typography>

                {selectedSummary && (
                  <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                    {selectedSummary.income > 0 && (
                      <Chip
                        size="small"
                        label={`+ ${formatCurrency(selectedSummary.income)}`}
                        sx={{ color: INCOME_POLE, fontWeight: 700, background: 'rgba(63,127,191,0.12)' }}
                      />
                    )}
                    {selectedSummary.expense > 0 && (
                      <Chip
                        size="small"
                        label={`− ${formatCurrency(selectedSummary.expense)}`}
                        sx={{ color: EXPENSE_POLE, fontWeight: 700, background: 'rgba(192,95,51,0.12)' }}
                      />
                    )}
                  </Box>
                )}

                {selectedBills.length > 0 && (
                  <Box sx={{ mb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {selectedBills.map((bill) => {
                      const overdue = isBillOverdue(bill);
                      return (
                        <Box key={bill.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          {bill.status === 'paid' ? (
                            <PaidIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                          ) : (
                            <OverdueIcon
                              sx={{ fontSize: 15, color: overdue ? OVERDUE_INK : 'text.secondary' }}
                            />
                          )}
                          <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                            {bill.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {bill.status === 'paid'
                              ? t('calendar.billPaid')
                              : overdue
                                ? t('bills.overdue')
                                : t('calendar.billOpen')}
                            {' · '}
                            {formatCurrency(Number(bill.amount), bill.currency)}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}

                {dayLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={22} />
                  </Box>
                ) : dayTransactions.length === 0 && selectedBills.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t('calendar.emptyDay')}
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {dayTransactions.map((transaction) => (
                      <Box
                        key={transaction.id}
                        sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}
                      >
                        <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                          {transaction.description}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{
                            color: transaction.type === 'income' ? INCOME_POLE : EXPENSE_POLE,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {transaction.type === 'income' ? '+' : '−'}
                          {formatCurrency(Number(transaction.amount), transaction.currency)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
