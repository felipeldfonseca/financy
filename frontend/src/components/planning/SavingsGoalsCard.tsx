import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Celebration as AchievedIcon,
  CheckCircle as MonthDoneIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandIcon,
  MoreVert as MoreVertIcon,
  TrackChanges as GoalIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { goalApi, Goal, GoalContribution, CreateGoalData, ContributeData } from '../../services/goalApi';
import { useFinancialContexts } from '../../contexts/ContextsContext';
import { useAuth } from '../../contexts/AuthContext';
import { canModifyTransaction } from '../../utils/contextPermissions';
import { canPayBills, parseLocalDate, sumByCurrency } from '../../utils/bills';
import { goalProgress } from '../../utils/goals';
import { GoalFormDialog } from './GoalFormDialog';
import { ContributeDialog } from './ContributeDialog';

const ACCENT = '#10b981';

/**
 * Savings goals with their named trail: every active goal of the current
 * view, its progress in numbers as well as a bar, and who saved what — the
 * same permission grammar the bills card follows.
 */
export const SavingsGoalsCard: React.FC = () => {
  const { t, i18n } = useTranslation('planning');
  const { selectedContextId, selectedContext } = useFinancialContexts();
  const { state: authState } = useAuth();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [contributingGoal, setContributingGoal] = useState<Goal | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; goal: Goal } | null>(null);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [trail, setTrail] = useState<GoalContribution[]>([]);
  const [trailLoading, setTrailLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const contextRole = selectedContext?.memberRole;
  const currentUserId = authState.user?.id;
  const defaultCurrency =
    selectedContext?.defaultCurrency || authState.user?.defaultCurrency || 'BRL';

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setGoals(await goalApi.list({ contextId: selectedContextId, status: 'active' }));
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedContextId]);

  useEffect(() => {
    load();
    setExpandedGoalId(null);
  }, [load]);

  const loadTrail = useCallback(async (goalId: string) => {
    setTrailLoading(true);
    try {
      setTrail(await goalApi.listContributions(goalId));
    } catch {
      setTrail([]);
    } finally {
      setTrailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (expandedGoalId) {
      loadTrail(expandedGoalId);
    } else {
      setTrail([]);
    }
  }, [expandedGoalId, loadTrail]);

  const formatCurrency = useCallback(
    (amount: number, currency: string) =>
      new Intl.NumberFormat(i18n.language, { style: 'currency', currency }).format(amount),
    [i18n.language],
  );

  const savedTotals = useMemo(
    () => sumByCurrency(goals.map((goal) => ({ amount: goal.currentAmount, currency: goal.currency }))),
    [goals],
  );

  const createGoal = async (data: CreateGoalData) => {
    await goalApi.create({ ...data, contextId: selectedContextId });
    await load();
  };

  const updateGoal = async (data: CreateGoalData) => {
    if (!editingGoal) return;
    const { contextId: _ignored, ...changes } = data;
    await goalApi.update(editingGoal.id, changes);
    await load();
  };

  const contribute = async (data: ContributeData) => {
    if (!contributingGoal) return;
    const result = await goalApi.contribute(contributingGoal.id, data);
    setMessage(
      result.goal.isAchieved ? (t('goals.achievedMessage') as string) : (t('goals.saved') as string),
    );
    await load();
    if (expandedGoalId === contributingGoal.id) {
      await loadTrail(contributingGoal.id);
    }
  };

  const archiveGoal = async (goal: Goal) => {
    setMenuAnchor(null);
    try {
      await goalApi.update(goal.id, { status: 'archived' });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  const deleteGoal = async (goal: Goal) => {
    setMenuAnchor(null);
    if (!window.confirm(t('goals.deleteConfirm', { name: goal.name }))) return;
    try {
      await goalApi.remove(goal.id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  const removeContribution = async (goalId: string, contributionId: string) => {
    try {
      await goalApi.removeContribution(goalId, contributionId);
      await load();
      await loadTrail(goalId);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  const canUndoContribution = (contribution: GoalContribution) =>
    contribution.userId === currentUserId ||
    contextRole === 'owner' ||
    contextRole === 'admin';

  return (
    <Card
      sx={{
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        height: '100%',
        minHeight: 300,
      }}
    >
      <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <GoalIcon sx={{ fontSize: 32, color: ACCENT }} />
          <Typography variant="h5" fontWeight={600} sx={{ flex: 1 }}>
            {t('goals.title')}
          </Typography>
          {canPayBills(contextRole) && (
            <Tooltip title={t('goals.add') as string}>
              <IconButton
                onClick={() => {
                  setEditingGoal(null);
                  setFormOpen(true);
                }}
                aria-label={t('goals.add') as string}
                sx={{ color: ACCENT, border: `1px solid ${ACCENT}55`, borderRadius: '12px' }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {isLoading ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={32} />
          </Box>
        ) : goals.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: 2,
            }}
          >
            <GoalIcon sx={{ fontSize: 56, color: ACCENT, opacity: 0.5 }} />
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
              {t('goals.empty')}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {goals.map((goal) => {
              // A habit's bar measures the month; an event's bar, the journey.
              const isHabit = goal.goalType === 'recurring';
              const progress = isHabit
                ? goalProgress(Number(goal.monthContributed ?? 0), Number(goal.monthlyTarget ?? 0))
                : goalProgress(Number(goal.currentAmount), Number(goal.targetAmount ?? 0));
              const monthDone = isHabit && progress.ratio >= 1;
              const canModify = canModifyTransaction({
                transactionUserId: goal.userId,
                currentUserId,
                contextRole,
              });
              const expanded = expandedGoalId === goal.id;

              return (
                <Box
                  key={goal.id}
                  sx={{
                    p: 2,
                    borderRadius: '14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: goal.color || ACCENT,
                        flexShrink: 0,
                      }}
                    />
                    <Typography fontWeight={600} noWrap sx={{ flex: 1 }}>
                      {goal.name}
                    </Typography>

                    <Chip
                      size="small"
                      label={isHabit ? `🔁 ${t('goals.habitChip')}` : `🎯 ${t('goals.eventChip')}`}
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'text.secondary',
                        background: 'rgba(0,0,0,0.05)',
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                    />

                    {monthDone && (
                      <Chip
                        size="small"
                        icon={<MonthDoneIcon sx={{ fontSize: 14 }} />}
                        label={t('goals.monthComplete')}
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: ACCENT,
                          background: `${ACCENT}1a`,
                          border: `1px solid ${ACCENT}66`,
                        }}
                      />
                    )}

                    {goal.isAchieved && (
                      <Chip
                        size="small"
                        icon={<AchievedIcon sx={{ fontSize: 14 }} />}
                        label={t('goals.achieved')}
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: ACCENT,
                          background: `${ACCENT}1a`,
                          border: `1px solid ${ACCENT}66`,
                        }}
                      />
                    )}

                    {canPayBills(contextRole) && !goal.isAchieved && (
                      <Chip
                        label={t('goals.contributeAction')}
                        onClick={() => setContributingGoal(goal)}
                        sx={{
                          fontWeight: 700,
                          color: ACCENT,
                          background: `${ACCENT}1f`,
                          border: `1px solid ${ACCENT}66`,
                          '&:hover': { background: `${ACCENT}33` },
                        }}
                      />
                    )}

                    <IconButton
                      size="small"
                      onClick={() => setExpandedGoalId(expanded ? null : goal.id)}
                      aria-label={t('goals.toggleTrail') as string}
                      sx={{
                        transform: expanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      <ExpandIcon fontSize="small" />
                    </IconButton>

                    {canModify && (
                      <IconButton
                        size="small"
                        aria-label={t('goals.rowMenu') as string}
                        onClick={(event) => setMenuAnchor({ element: event.currentTarget, goal })}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>

                  <Box
                    sx={{
                      mt: 1.5,
                      height: 10,
                      borderRadius: '5px',
                      background: 'rgba(0,0,0,0.06)',
                      overflow: 'hidden',
                    }}
                    role="img"
                    aria-label={`${Math.round(progress.ratio * 100)}%`}
                  >
                    <Box
                      sx={{
                        width: `${progress.percent}%`,
                        height: '100%',
                        background: goal.color || ACCENT,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.75, gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary">
                      {isHabit
                        ? t('goals.monthProgressLabel', {
                            current: formatCurrency(Number(goal.monthContributed ?? 0), goal.currency),
                            target: formatCurrency(Number(goal.monthlyTarget ?? 0), goal.currency),
                            month: new Date().toLocaleDateString(i18n.language, { month: 'long' }),
                            percent: Math.round(progress.ratio * 100),
                          })
                        : t('goals.progressLabel', {
                            current: formatCurrency(Number(goal.currentAmount), goal.currency),
                            target: formatCurrency(Number(goal.targetAmount ?? 0), goal.currency),
                            percent: Math.round(progress.ratio * 100),
                          })}
                    </Typography>
                    {isHabit ? (
                      <Typography variant="caption" color="text.secondary">
                        {t('goals.accumulated', {
                          total: formatCurrency(Number(goal.currentAmount), goal.currency),
                        })}
                      </Typography>
                    ) : (
                      goal.targetDate && (
                        <Typography variant="caption" color="text.secondary">
                          {t('goals.byDate', {
                            date: parseLocalDate(goal.targetDate).toLocaleDateString(i18n.language),
                          })}
                        </Typography>
                      )
                    )}
                  </Box>

                  <Collapse in={expanded} unmountOnExit>
                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                      {trailLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
                          <CircularProgress size={18} />
                        </Box>
                      ) : trail.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          {t('goals.noContributions')}
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {trail.map((contribution) => (
                            <Box
                              key={contribution.id}
                              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                            >
                              <Typography variant="body2" fontWeight={700} sx={{ color: ACCENT }}>
                                +{formatCurrency(Number(contribution.amount), goal.currency)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                                {parseLocalDate(contribution.date).toLocaleDateString(i18n.language)}
                                {contribution.user
                                  ? ` · ${contribution.user.firstName} ${contribution.user.lastName}`
                                  : ''}
                              </Typography>
                              {canUndoContribution(contribution) && (
                                <IconButton
                                  size="small"
                                  aria-label={t('goals.undoContribution') as string}
                                  onClick={() => removeContribution(goal.id, contribution.id)}
                                >
                                  <DeleteIcon sx={{ fontSize: 15 }} />
                                </IconButton>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}

            <Box
              sx={{
                mt: 'auto',
                pt: 2,
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {t('goals.totalSaved')}
              </Typography>
              <Typography variant="numeric" fontWeight={700}>
                {savedTotals.map(({ currency, total }) => formatCurrency(total, currency)).join(' · ')}
              </Typography>
            </Box>
          </Box>
        )}

        <Menu
          anchorEl={menuAnchor?.element}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              if (menuAnchor) {
                setEditingGoal(menuAnchor.goal);
                setFormOpen(true);
              }
              setMenuAnchor(null);
            }}
          >
            {t('goals.menu.edit')}
          </MenuItem>
          <MenuItem onClick={() => menuAnchor && archiveGoal(menuAnchor.goal)}>
            {t('goals.menu.archive')}
          </MenuItem>
          <MenuItem onClick={() => menuAnchor && deleteGoal(menuAnchor.goal)}>
            {t('goals.menu.delete')}
          </MenuItem>
        </Menu>

        <GoalFormDialog
          open={formOpen}
          goal={editingGoal}
          defaultCurrency={defaultCurrency}
          onClose={() => {
            setFormOpen(false);
            setEditingGoal(null);
          }}
          onSubmit={editingGoal ? updateGoal : createGoal}
        />

        <ContributeDialog
          goal={contributingGoal}
          onClose={() => setContributingGoal(null)}
          onConfirm={contribute}
        />

        <Snackbar
          open={Boolean(message)}
          autoHideDuration={5000}
          onClose={() => setMessage(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" onClose={() => setMessage(null)}>
            {message}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
};
