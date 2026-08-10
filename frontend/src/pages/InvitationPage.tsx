import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CircularProgress, Typography } from '@mui/material';
import { Group as GroupIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { contextApi } from '../services/contextApi';
import { useFinancialContexts } from '../contexts/ContextsContext';

type Status = 'accepting' | 'accepted' | 'failed';

/**
 * Landing page for the invitation links members share with each other. The
 * route is protected, so an invitee who is not signed in reaches the login
 * page first and can come back to the same link afterwards.
 */
const InvitationPage: React.FC = () => {
  const { t } = useTranslation('contexts');
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { reload, selectContext } = useFinancialContexts();

  const [status, setStatus] = useState<Status>('accepting');
  const [error, setError] = useState<string | null>(null);
  const [contextId, setContextId] = useState<string | null>(null);

  const accept = useCallback(async () => {
    if (!token) return;

    setStatus('accepting');
    setError(null);

    try {
      const member = await contextApi.acceptInvitation(token);
      setContextId(member.contextId);
      setStatus('accepted');
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
      setStatus('failed');
    }
  }, [token, reload]);

  useEffect(() => {
    accept();
  }, [accept]);

  const openContext = () => {
    if (contextId) selectContext(contextId);
    navigate('/transactions');
  };

  return (
    <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
      <Card
        sx={{
          p: 4,
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
        }}
      >
        <GroupIcon sx={{ fontSize: 48, opacity: 0.5 }} />

        {status === 'accepting' && (
          <>
            <Typography variant="h6" sx={{ mt: 1 }}>
              {t('invitation.accepting')}
            </Typography>
            <CircularProgress sx={{ mt: 3 }} />
          </>
        )}

        {status === 'accepted' && (
          <>
            <Typography variant="h6" sx={{ mt: 1 }}>
              {t('invitation.accepted')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('invitation.acceptedHint')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Button variant="contained" onClick={openContext}>
                {t('invitation.openContext')}
              </Button>
              <Button onClick={() => navigate('/contexts')}>{t('invitation.seeAll')}</Button>
            </Box>
          </>
        )}

        {status === 'failed' && (
          <>
            <Typography variant="h6" sx={{ mt: 1 }}>
              {t('invitation.failed')}
            </Typography>
            <Alert severity="error" sx={{ my: 2, textAlign: 'left' }}>
              {error}
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('invitation.failedHint')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Button variant="contained" onClick={accept}>
                {t('invitation.retry')}
              </Button>
              <Button onClick={() => navigate('/contexts')}>{t('invitation.seeAll')}</Button>
            </Box>
          </>
        )}
      </Card>
    </Box>
  );
};

export default InvitationPage;
