import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import {
  CheckCircle as OnTrackIcon,
  WarningAmber as BehindIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Goal, GoalContribution } from '../../services/goalApi';
import {
  futureValue,
  monthlyPercentFrom,
  projectionSeries,
  requiredMonthlyDeposit,
  monthsUntil,
  averageMonthlyDeposit,
} from '../../utils/projections';
import { parseLocalDate } from '../../utils/bills';

const ACCENT = '#10b981';
const NEUTRAL_LINE = '#8a8f98';
const CHART_MONTHS = 24;

interface Props {
  goal: Goal;
  trail: GoalContribution[];
  trailLoading: boolean;
}

/**
 * What the numbers become if the habit holds: a 1/5/10-year table and a
 * 24-month curve, with and without the quoted yield — plus, for an event
 * goal with a deadline, the pace it actually needs versus the pace it has.
 * Everything here is derived on the client; nothing is stored.
 */
export const GoalProjectionsPanel: React.FC<Props> = ({ goal, trail, trailLoading }) => {
  const { t, i18n } = useTranslation('planning');

  // All the math runs on % a.m.; the labels echo the unit the user typed.
  const quotedRate = Number(goal.expectedGrowthRate ?? 0);
  const ratePeriod = goal.growthRatePeriod ?? 'yearly';
  const rate = monthlyPercentFrom(quotedRate, ratePeriod);
  const hasYield = rate > 0;
  const principal = Number(goal.currentAmount);
  const monthly = Number(goal.monthlyTarget ?? 0);
  const isHabit = goal.goalType === 'recurring';
  const color = goal.color || ACCENT;

  const money = (amount: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: goal.currency,
      maximumFractionDigits: 0,
    }).format(amount);

  const moneyCompact = (amount: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: goal.currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);

  const chart = useMemo(() => {
    if (!isHabit) return null;

    const flat = projectionSeries(principal, monthly, 0, CHART_MONTHS);
    const grown = hasYield ? projectionSeries(principal, monthly, rate, CHART_MONTHS) : null;

    const width = 320;
    const height = 130;
    const plotLeft = 6;
    const plotRight = hasYield ? 236 : 268;
    const plotTop = 10;
    const plotBottom = 108;

    const values = [...flat, ...(grown ?? [])];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;

    const x = (month: number) =>
      plotLeft + ((plotRight - plotLeft) * month) / CHART_MONTHS;
    const y = (value: number) =>
      plotBottom - ((plotBottom - plotTop) * (value - min)) / span;

    const points = (series: number[]) =>
      series.map((value, month) => `${x(month).toFixed(1)},${y(value).toFixed(1)}`).join(' ');

    // Direct labels at the line ends; nudge apart when the curves finish close.
    let flatLabelY = y(flat[CHART_MONTHS]);
    let grownLabelY = grown ? y(grown[CHART_MONTHS]) : null;
    if (grownLabelY != null && flatLabelY - grownLabelY < 12) {
      const middle = (flatLabelY + grownLabelY) / 2;
      grownLabelY = middle - 6;
      flatLabelY = middle + 6;
    }

    return {
      width,
      height,
      plotLeft,
      plotRight,
      plotTop,
      plotBottom,
      flatPoints: points(flat),
      grownPoints: grown ? points(grown) : null,
      flatEnd: flat[CHART_MONTHS],
      grownEnd: grown ? grown[CHART_MONTHS] : null,
      flatLabelY,
      grownLabelY,
      gridYs: [plotTop, (plotTop + plotBottom) / 2, plotBottom],
      x,
    };
  }, [isHabit, principal, monthly, rate, hasYield]);

  const pace = useMemo(() => {
    if (isHabit || !goal.targetDate || goal.isAchieved) return null;
    const months = monthsUntil(goal.targetDate);
    if (months <= 0) return null;

    const needed = requiredMonthlyDeposit(Number(goal.targetAmount ?? 0), principal, rate, months);
    if (needed == null) return null;

    const average = averageMonthlyDeposit(
      trail.map((entry) => ({ amount: entry.amount, date: entry.date, kind: entry.kind })),
      3,
    );

    return { months, needed, average, behind: average < needed };
  }, [isHabit, goal.targetDate, goal.targetAmount, goal.isAchieved, principal, rate, trail]);

  if (!chart && !pace) {
    return null;
  }

  const horizons = [
    { label: t('goals.projections.horizon1'), months: 12 },
    { label: t('goals.projections.horizon5'), months: 60 },
    { label: t('goals.projections.horizon10'), months: 120 },
  ];

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
        {t('goals.projections.title')}
      </Typography>

      {chart && (
        <>
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              mb: 1,
              '& th, & td': {
                textAlign: 'right',
                py: 0.4,
                fontSize: '0.75rem',
                fontVariantNumeric: 'tabular-nums',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
              },
              '& th:first-of-type, & td:first-of-type': { textAlign: 'left' },
            }}
          >
            <Box component="thead">
              <Box component="tr" sx={{ '& th': { color: 'text.secondary', fontWeight: 600 } }}>
                <Box component="th">{''}</Box>
                <Box component="th">{t('goals.projections.withoutYield')}</Box>
                {hasYield && (
                  <Box component="th">
                    {t(
                      ratePeriod === 'monthly'
                        ? 'goals.projections.withYieldMonthly'
                        : 'goals.projections.withYieldYearly',
                      {
                        rate: quotedRate.toLocaleString(i18n.language, {
                          maximumFractionDigits: 3,
                        }),
                      },
                    )}
                  </Box>
                )}
              </Box>
            </Box>
            <Box component="tbody">
              {horizons.map(({ label, months }) => (
                <Box component="tr" key={months}>
                  <Box component="td" sx={{ color: 'text.secondary' }}>
                    {label}
                  </Box>
                  <Box component="td">{money(futureValue(principal, monthly, 0, months))}</Box>
                  {hasYield && (
                    <Box component="td" sx={{ fontWeight: 700 }}>
                      {money(futureValue(principal, monthly, rate, months))}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Box>

          <Box
            component="svg"
            viewBox={`0 0 ${chart.width} ${chart.height}`}
            sx={{ width: '100%', height: 'auto', display: 'block' }}
            role="img"
            aria-label={t('goals.projections.chartLabel') as string}
          >
            {chart.gridYs.map((gridY) => (
              <line
                key={gridY}
                x1={chart.plotLeft}
                x2={chart.plotRight}
                y1={gridY}
                y2={gridY}
                stroke="rgba(0,0,0,0.08)"
                strokeWidth={1}
              />
            ))}

            <polyline
              points={chart.flatPoints}
              fill="none"
              stroke={chart.grownPoints ? NEUTRAL_LINE : color}
              strokeWidth={chart.grownPoints ? 1.75 : 2.25}
              strokeDasharray={chart.grownPoints ? '5 4' : undefined}
            />
            {chart.grownPoints && (
              <polyline points={chart.grownPoints} fill="none" stroke={color} strokeWidth={2.25} />
            )}

            {chart.grownEnd != null && chart.grownLabelY != null && (
              <text
                x={chart.plotRight + 6}
                y={chart.grownLabelY + 3}
                fontSize={10}
                fontWeight={700}
                fill={color}
              >
                {moneyCompact(chart.grownEnd)}
              </text>
            )}
            <text
              x={chart.plotRight + 6}
              y={chart.flatLabelY + 3}
              fontSize={10}
              fill={NEUTRAL_LINE}
            >
              {moneyCompact(chart.flatEnd)}
            </text>

            {[
              { month: 0, label: t('goals.projections.today') },
              { month: 12, label: t('goals.projections.oneYear') },
              { month: 24, label: t('goals.projections.twoYears') },
            ].map(({ month, label }) => (
              <text
                key={month}
                x={chart.x(month)}
                y={chart.height - 6}
                fontSize={9}
                fill="rgba(0,0,0,0.45)"
                textAnchor={month === 0 ? 'start' : month === 24 ? 'end' : 'middle'}
              >
                {label}
              </text>
            ))}
          </Box>
        </>
      )}

      {pace && !trailLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          <Typography variant="caption" color="text.secondary">
            {t('goals.pace.needed', {
              amount: money(pace.needed),
              date: parseLocalDate(goal.targetDate as string).toLocaleDateString(i18n.language, {
                month: 'short',
                year: 'numeric',
              }),
            })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('goals.pace.average', { amount: money(pace.average) })}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            {pace.behind ? (
              <BehindIcon sx={{ fontSize: 14, color: '#b45309' }} />
            ) : (
              <OnTrackIcon sx={{ fontSize: 14, color: ACCENT }} />
            )}
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ color: pace.behind ? '#b45309' : ACCENT }}
            >
              {pace.behind ? t('goals.pace.behind') : t('goals.pace.onTrack')}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};
