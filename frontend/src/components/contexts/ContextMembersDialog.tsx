import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Avatar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  PersonRemove as RemoveIcon,
  PersonAdd as InviteIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import {
  ContextMember,
  FinancialContext,
  MemberRole,
  contextApi,
  invitationUrl,
} from '../../services/contextApi';
import {
  assignableRoles,
  canChangeRole,
  canManageMembers,
  canRemoveMember,
  findOwnMembership,
  isInvitationExpired,
  isInvitationPending,
} from '../../utils/contextPermissions';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  open: boolean;
  context: FinancialContext | null;
  onClose: () => void;
}

export const ContextMembersDialog: React.FC<Props> = ({ open, context, onClose }) => {
  const { t } = useTranslation('contexts');
  const { state: authState } = useAuth();

  const [members, setMembers] = useState<ContextMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [pendingLink, setPendingLink] = useState<string | null>(null);

  const ownMembership = findOwnMembership(members, authState.user?.id);
  const ownRole = ownMembership?.role;

  const load = useCallback(async () => {
    if (!context) return;

    setIsLoading(true);
    setError(null);

    try {
      setMembers(await contextApi.getMembers(context.id));
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [context]);

  useEffect(() => {
    if (!open) {
      setPendingLink(null);
      setNotice(null);
      setInviteEmail('');
      return;
    }
    load();
  }, [open, load]);

  const invite = async () => {
    if (!context || !inviteEmail.trim()) return;

    setIsInviting(true);
    setError(null);
    setNotice(null);

    try {
      const recipient = inviteEmail.trim();
      const member = await contextApi.invite(context.id, {
        email: recipient,
        role: inviteRole,
      });

      setInviteEmail('');
      // The link is shown either way: it is the only delivery route when email
      // is not configured, and a useful fallback when it is.
      setPendingLink(member.inviteToken ? invitationUrl(member.inviteToken) : null);
      setNotice(
        member.invitationEmailSent
          ? t('members.inviteEmailed', { email: recipient })
          : t('members.inviteCreated'),
      );
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const changeRole = async (member: ContextMember, role: MemberRole) => {
    if (!context) return;

    setError(null);
    try {
      await contextApi.updateMemberRole(context.id, member.id, role);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  const remove = async (member: ContextMember) => {
    if (!context) return;

    setError(null);
    try {
      await contextApi.removeMember(context.id, member.id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    }
  };

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setNotice(t('members.linkCopied'));
    } catch {
      // Clipboard access can be denied; the link is on screen either way.
      setNotice(t('members.linkCopyFailed'));
    }
  };

  const displayName = (member: ContextMember): string => {
    const user = member.user;
    if (!user) return t('members.unknownUser');
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return name || user.email;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('members.title')}
        {context && (
          <Typography variant="body2" color="text.secondary">
            {context.name}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {notice && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
            {notice}
          </Alert>
        )}

        {canManageMembers(ownRole) && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('members.inviteTitle')}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {t('members.inviteHint')}
            </Typography>

            <Grid container spacing={1} alignItems="center">
              <Grid item xs={12} sm={6}>
                <TextField
                  label={t('members.email')}
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  size="small"
                  fullWidth
                  type="email"
                />
              </Grid>
              <Grid item xs={7} sm={3}>
                <TextField
                  select
                  label={t('members.role')}
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as MemberRole)}
                  size="small"
                  fullWidth
                >
                  {assignableRoles(ownRole).map((role) => (
                    <MenuItem key={role} value={role}>
                      {t(`roles.${role}`)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={5} sm={3}>
                <Button
                  onClick={invite}
                  variant="contained"
                  size="medium"
                  fullWidth
                  disabled={isInviting || !inviteEmail.trim()}
                  startIcon={<InviteIcon />}
                >
                  {t('members.invite')}
                </Button>
              </Grid>
            </Grid>

            {pendingLink && (
              <Alert
                severity="info"
                sx={{ mt: 2, wordBreak: 'break-all' }}
                action={
                  <IconButton size="small" onClick={() => copy(pendingLink)} aria-label={t('members.copyLink')}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                }
              >
                <Typography variant="caption" display="block">
                  {t('members.shareLink')}
                </Typography>
                {pendingLink}
              </Alert>
            )}

            <Divider sx={{ mt: 2 }} />
          </Box>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <List dense>
            {members.map((member) => (
              <ListItem
                key={member.id}
                secondaryAction={
                  canRemoveMember(ownRole, member) ? (
                    <Tooltip title={t('members.remove')}>
                      <IconButton edge="end" onClick={() => remove(member)} aria-label={t('members.remove')}>
                        <RemoveIcon />
                      </IconButton>
                    </Tooltip>
                  ) : null
                }
              >
                <ListItemAvatar>
                  <Avatar>{displayName(member).charAt(0).toUpperCase()}</Avatar>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                      {displayName(member)}
                      {isInvitationPending(member) && (
                        <Chip
                          size="small"
                          label={
                            isInvitationExpired(member)
                              ? t('members.invitationExpired')
                              : t('members.invitationPending')
                          }
                          color={isInvitationExpired(member) ? 'default' : 'warning'}
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={member.user?.email}
                />

                <Box sx={{ mr: 6, minWidth: 120 }}>
                  {canChangeRole(ownRole, member) ? (
                    <TextField
                      select
                      size="small"
                      value={member.role}
                      onChange={(event) => changeRole(member, event.target.value as MemberRole)}
                      fullWidth
                    >
                      {assignableRoles(ownRole).map((role) => (
                        <MenuItem key={role} value={role}>
                          {t(`roles.${role}`)}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <Chip size="small" label={t(`roles.${member.role}`)} />
                  )}
                </Box>
              </ListItem>
            ))}

            {members.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                {t('members.empty')}
              </Typography>
            )}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('actions.close')}</Button>
      </DialogActions>
    </Dialog>
  );
};
