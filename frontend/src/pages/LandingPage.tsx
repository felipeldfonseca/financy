import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation, useInView } from 'framer-motion';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Psychology as AIIcon,
  Group as GroupIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  CloudSync as CloudIcon,
  ExpandMore as ExpandMoreIcon,
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendingIcon,
  Photo as PhotoIcon,
  Mic as MicIcon,
  Phone as PhoneIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  AttachMoney as MoneyIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import ChartSection from '../components/dashboard/ChartSection';
import { useTranslation } from 'react-i18next';

const LandingPage: React.FC = () => {
  const { t } = useTranslation(['common', 'auth', 'landing']);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedFAQ, setExpandedFAQ] = useState<string | false>(false);
  const [activeContext, setActiveContext] = useState(0);
  const [contextKey, setContextKey] = useState(0); // For re-triggering animations

  // Animations
  const heroControls = useAnimation();
  const featuresControls = useAnimation();
  const heroRef = React.useRef(null);
  const featuresRef = React.useRef(null);
  const isHeroInView = useInView(heroRef);
  const isFeaturesInView = useInView(featuresRef);

  useEffect(() => {
    if (isHeroInView) {
      heroControls.start("visible");
    }
  }, [isHeroInView, heroControls]);

  useEffect(() => {
    if (isFeaturesInView) {
      featuresControls.start("visible");
    }
  }, [isFeaturesInView, featuresControls]);

  const handleFAQChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedFAQ(isExpanded ? panel : false);
  };

  const nextContext = () => {
    setActiveContext((prev) => (prev + 1) % contextScenarios.length);
    setContextKey(prev => prev + 1);
  };

  const prevContext = () => {
    setActiveContext((prev) => (prev - 1 + contextScenarios.length) % contextScenarios.length);
    setContextKey(prev => prev + 1);
  };

  const goToContext = (index: number) => {
    setActiveContext(index);
    setContextKey(prev => prev + 1);
  };

  // Auto-rotate contexts every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      nextContext();
    }, 10000);

    return () => clearInterval(interval);
  }, [activeContext]); // Reset timer when activeContext changes

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      }
    }
  };

  const floatingAnimation = {
    y: [-10, 10, -10],
    transition: {
      duration: 4,
      repeat: Infinity,
    }
  };


  const features = [
    {
      icon: <ChatIcon sx={{ fontSize: 40 }} />,
      title: t('landing:features.conversational.title'),
      description: t('landing:features.conversational.description'),
      color: "#45b8d7",
    },
    {
      icon: <AIIcon sx={{ fontSize: 40 }} />,
      title: t('landing:features.ai.title'),
      description: t('landing:features.ai.description'),
      color: "#10b981",
    },
    {
      icon: <GroupIcon sx={{ fontSize: 40 }} />,
      title: t('landing:features.collaborative.title'),
      description: t('landing:features.collaborative.description'),
      color: "#6366f1",
    },
  ];

  const howItWorksSteps = [
    {
      step: 1,
      icon: <ChatIcon sx={{ fontSize: 30 }} />,
      title: t('landing:howItWorks.steps.send.title'),
      description: t('landing:howItWorks.steps.send.description'),
    },
    {
      step: 2,
      icon: <AIIcon sx={{ fontSize: 30 }} />,
      title: t('landing:howItWorks.steps.process.title'),
      description: t('landing:howItWorks.steps.process.description'),
    },
    {
      step: 3,
      icon: <TrendingIcon sx={{ fontSize: 30 }} />,
      title: t('landing:howItWorks.steps.organize.title'),
      description: t('landing:howItWorks.steps.organize.description'),
    },
  ];

  const faqs = [
    {
      question: t('landing:faq.items.security.question'),
      answer: t('landing:faq.items.security.answer')
    },
    {
      question: t('landing:faq.items.platforms.question'),
      answer: t('landing:faq.items.platforms.answer')
    },
    {
      question: t('landing:faq.items.family.question'),
      answer: t('landing:faq.items.family.answer')
    },
    {
      question: t('landing:faq.items.accuracy.question'),
      answer: t('landing:faq.items.accuracy.answer')
    },
    {
      question: t('landing:faq.items.mobile.question'),
      answer: t('landing:faq.items.mobile.answer')
    },
  ];

  // Mock data for demo charts
  const mockExpenseData = [
    { name: t('landing:charts.categories.foodAndDining'), value: 450, color: '#ff6b6b' },
    { name: t('landing:charts.categories.transportation'), value: 280, color: '#4ecdc4' },
    { name: t('landing:charts.categories.shopping'), value: 320, color: '#45b7d1' },
    { name: t('landing:charts.categories.billsAndUtilities'), value: 180, color: '#96ceb4' },
    { name: t('landing:charts.categories.entertainment'), value: 150, color: '#feca57' },
  ];

  const mockMonthlyData = [
    { month: t('landing:charts.months.jan'), income: 3500, expenses: 2800, netAmount: 700, savingsRate: 20 },
    { month: t('landing:charts.months.feb'), income: 3200, expenses: 2600, netAmount: 600, savingsRate: 18.8 },
    { month: t('landing:charts.months.mar'), income: 3800, expenses: 3100, netAmount: 700, savingsRate: 18.4 },
    { month: t('landing:charts.months.apr'), income: 3600, expenses: 2900, netAmount: 700, savingsRate: 19.4 },
    { month: t('landing:charts.months.may'), income: 4000, expenses: 3200, netAmount: 800, savingsRate: 20 },
    { month: t('landing:charts.months.jun'), income: 3700, expenses: 2850, netAmount: 850, savingsRate: 23 },
  ];

  const mockChatMessages = [
    { 
      id: 1, 
      text: t('landing:chatDemo.messages.lunch'), 
      isUser: true, 
      time: "2:34 PM" 
    },
    { 
      id: 2, 
      text: t('landing:chatDemo.messages.lunchConfirm'), 
      isUser: false, 
      time: "2:34 PM" 
    },
    { 
      id: 3, 
      text: t('landing:chatDemo.messages.gas'), 
      isUser: true, 
      time: "3:15 PM" 
    },
    { 
      id: 4, 
      text: t('landing:chatDemo.messages.gasConfirm'), 
      isUser: false, 
      time: "3:15 PM" 
    },
    { 
      id: 5, 
      text: t('landing:chatDemo.messages.coffee'), 
      isUser: true, 
      time: "4:20 PM" 
    },
    { 
      id: 6, 
      text: t('landing:chatDemo.messages.coffeeConfirm'), 
      isUser: false, 
      time: "4:20 PM" 
    },
  ];

  const contextScenarios = [
    {
      id: 'family',
      title: t('landing:contexts.family.title'),
      subtitle: t('landing:contexts.family.subtitle'),
      gradient: 'linear-gradient(135deg, #ff9a8b 0%, #ad5389 100%)',
      messages: [
        { id: 1, text: t('landing:contexts.family.messages.groceries'), isUser: true, user: "Sarah", time: "10:30 AM" },
        { id: 2, text: t('landing:contexts.family.messages.groceriesConfirm'), isUser: false, time: "10:30 AM" },
        { id: 3, text: t('landing:contexts.family.messages.movieTickets'), isUser: true, user: "Mike", time: "2:15 PM" },
        { id: 4, text: t('landing:contexts.family.messages.movieConfirm'), isUser: false, time: "2:15 PM" },
      ]
    },
    {
      id: 'friends',
      title: t('landing:contexts.friends.title'),
      subtitle: t('landing:contexts.friends.subtitle'),
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      messages: [
        { id: 1, text: t('landing:contexts.friends.messages.dinner'), isUser: true, user: "Jessica", time: "7:45 PM" },
        { id: 2, text: t('landing:contexts.friends.messages.dinnerConfirm'), isUser: false, time: "7:45 PM" },
        { id: 3, text: t('landing:contexts.friends.messages.uber'), isUser: true, user: "Tom", time: "9:30 PM" },
        { id: 4, text: t('landing:contexts.friends.messages.uberConfirm'), isUser: false, time: "9:30 PM" },
      ]
    },
    {
      id: 'travel',
      title: t('landing:contexts.travel.title'),
      subtitle: t('landing:contexts.travel.subtitle'),
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      messages: [
        { id: 1, text: t('landing:contexts.travel.messages.hotel'), isUser: true, user: "Alex", time: "9:00 AM" },
        { id: 2, text: t('landing:contexts.travel.messages.hotelConfirm'), isUser: false, time: "9:00 AM" },
        { id: 3, text: t('landing:contexts.travel.messages.dinner'), isUser: true, user: "Emma", time: "8:30 PM" },
        { id: 4, text: t('landing:contexts.travel.messages.dinnerConfirm'), isUser: false, time: "8:30 PM" },
      ]
    },
    {
      id: 'business',
      title: t('landing:contexts.business.title'),
      subtitle: t('landing:contexts.business.subtitle'),
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      messages: [
        { id: 1, text: t('landing:contexts.business.messages.clientLunch'), isUser: true, user: "Manager", time: "1:15 PM" },
        { id: 2, text: t('landing:contexts.business.messages.clientLunchConfirm'), isUser: false, time: "1:15 PM" },
        { id: 3, text: t('landing:contexts.business.messages.supplies'), isUser: true, user: "Assistant", time: "3:00 PM" },
        { id: 4, text: t('landing:contexts.business.messages.suppliesConfirm'), isUser: false, time: "3:00 PM" },
      ]
    },
    {
      id: 'project',
      title: t('landing:contexts.project.title'),
      subtitle: t('landing:contexts.project.subtitle'),
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      messages: [
        { id: 1, text: t('landing:contexts.project.messages.adobe'), isUser: true, user: "Designer", time: "10:00 AM" },
        { id: 2, text: t('landing:contexts.project.messages.adobeConfirm'), isUser: false, time: "10:00 AM" },
        { id: 3, text: t('landing:contexts.project.messages.photos'), isUser: true, user: "Developer", time: "2:30 PM" },
        { id: 4, text: t('landing:contexts.project.messages.photosConfirm'), isUser: false, time: "2:30 PM" },
      ]
    }
  ];

  const currentContext = contextScenarios[activeContext];

  return (
    <Box sx={{ minHeight: '100vh', overflow: 'hidden' }}>

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ pt: 8, pb: 4 }}>
        <Box ref={heroRef} textAlign="center" sx={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <motion.div
            initial="hidden"
            animate={heroControls}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <Typography
                variant="brand"
                component="h1"
                sx={{
                  color: 'text.primary',
                  fontSize: { xs: '2.5rem', md: '4rem' },
                  mb: 2,
                  background: 'linear-gradient(45deg, #45b8d7, #10b981)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
{t('landing:hero.title')}
              </Typography>
            </motion.div>
            
            <motion.div variants={fadeInUp}>
              <Typography variant="h4" color="text.secondary" paragraph sx={{ maxWidth: '600px', mx: 'auto', mb: 3 }}>
                {t('landing:hero.subtitle')}
              </Typography>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Typography variant="h6" color="text.secondary" paragraph sx={{ maxWidth: '800px', mx: 'auto', mb: 6 }}>
                {t('landing:hero.description')}
              </Typography>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/login')}
                    sx={{
                      px: 4,
                      py: 2,
                      fontSize: '1.1rem',
                      background: 'linear-gradient(45deg, #45b8d7, #10b981)',
                      borderRadius: '50px',
                      textTransform: 'none',
                      fontWeight: 600,
                      boxShadow: '0 8px 32px rgba(69, 184, 215, 0.3)',
                      '&:hover': {
                        boxShadow: '0 12px 40px rgba(69, 184, 215, 0.4)',
                      },
                    }}
                  >
{t('landing:hero.getStarted')}
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                    sx={{
                      px: 4,
                      py: 2,
                      fontSize: '1.1rem',
                      borderRadius: '50px',
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: 'primary.main',
                      '&:hover': {
                        borderColor: 'primary.dark',
                        background: 'rgba(69, 184, 215, 0.1)',
                      },
                    }}
                  >
{t('landing:hero.learnMore')}
                  </Button>
                </motion.div>
              </Box>
            </motion.div>

            {/* Animated Wallet Icon */}
            <motion.div
              variants={fadeInUp}
              style={{ marginTop: '4rem', display: 'flex', justifyContent: 'center' }}
            >
              <motion.div animate={floatingAnimation}>
                <WalletIcon 
                  sx={{ 
                    fontSize: 80, 
                    color: 'primary.main', 
                    opacity: 0.6,
                    filter: 'drop-shadow(0 4px 20px rgba(69, 184, 215, 0.3))'
                  }} 
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </Box>
      </Container>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }} id="features">
        <motion.div
          ref={featuresRef}
          initial="hidden"
          animate={featuresControls}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp}>
            <Typography variant="h3" textAlign="center" gutterBottom sx={{ mb: 6, fontWeight: 600 }}>
              {t('landing:features.title')}
            </Typography>
          </motion.div>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <motion.div
                  variants={fadeInUp}
                  whileHover={{ 
                    scale: 1.05,
                    rotateY: 5,
                    rotateX: 5,
                  }}
                  style={{ height: '100%' }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '24px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `linear-gradient(135deg, ${feature.color}15 0%, ${feature.color}05 100%)`,
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                        zIndex: 0,
                      },
                      '&:hover::before': {
                        opacity: 1,
                      },
                    }}
                  >
                    <CardContent sx={{ p: 4, position: 'relative', zIndex: 1, textAlign: 'center' }}>
                      <motion.div
                        animate={{
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: [0.4, 0, 0.2, 1],
                        }}
                        style={{ 
                          display: 'inline-block',
                          marginBottom: '1.5rem',
                          padding: '1rem',
                          borderRadius: '20px',
                          background: `${feature.color}20`,
                          color: feature.color,
                        }}
                      >
                        {feature.icon}
                      </motion.div>
                      
                      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                        {feature.title}
                      </Typography>
                      
                      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      </Container>

      {/* How It Works Section */}
      <Box sx={{ py: 8, background: 'linear-gradient(135deg, rgba(69, 184, 215, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)' }}>
        <Container maxWidth="lg">
          <Typography variant="h3" textAlign="center" gutterBottom sx={{ mb: 8, fontWeight: 600 }}>
            {t('landing:howItWorks.title')}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 4, md: 2 }, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
            {howItWorksSteps.map((step, index) => (
              <React.Fragment key={step.step}>
                <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 auto' }, maxWidth: { xs: 'none', md: '280px' }, textAlign: 'center' }}>
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                    viewport={{ once: true }}
                  >
                    <Box textAlign="center">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        style={{
                          display: 'inline-block',
                          marginBottom: '1.5rem',
                          padding: '1.5rem',
                          borderRadius: '50%',
                          background: 'linear-gradient(45deg, #45b8d7, #10b981)',
                          color: 'white',
                          boxShadow: '0 8px 32px rgba(69, 184, 215, 0.3)',
                        }}
                      >
                        {step.icon}
                      </motion.div>
                      
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        {step.step}. {step.title}
                      </Typography>
                      
                      <Typography variant="body1" color="text.secondary">
                        {step.description}
                      </Typography>
                    </Box>
                  </motion.div>
                </Box>
                
                {index < howItWorksSteps.length - 1 && (
                  <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'center', minWidth: '80px' }}>
                    <motion.div
                      animate={{
                        x: [0, 8, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          boxShadow: '0 8px 32px rgba(69, 184, 215, 0.15)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        <ChevronRightIcon 
                          sx={{ 
                            fontSize: 28, 
                            color: 'rgba(69, 184, 215, 0.8)',
                            filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1))'
                          }} 
                        />
                      </Box>
                    </motion.div>
                  </Box>
                )}
              </React.Fragment>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Chat Interface Demo */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box textAlign="center" sx={{ mb: 8 }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 600 }}>
              {t('landing:demo.conversational.title')}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
              {t('landing:demo.conversational.description')}
            </Typography>
          </motion.div>
        </Box>

        <Box sx={{ maxWidth: '500px', mx: 'auto' }}>
          <Card
            sx={{
              height: 500,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '20px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <CardContent sx={{ p: 0, height: '100%' }}>
              {/* Chat Header */}
              <Box
                sx={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  p: 2,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #45b8d7, #10b981)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AIIcon sx={{ color: 'white', fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                    Financy AI
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Online
                  </Typography>
                </Box>
              </Box>

              {/* Chat Messages */}
              <Box
                sx={{
                  p: 2,
                  height: 'calc(100% - 80px)',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {mockChatMessages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.8 }}
                    viewport={{ once: true, margin: "-100px" }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: message.isUser ? 'flex-end' : 'flex-start',
                        mb: 1,
                      }}
                    >
                      <Paper
                        sx={{
                          p: 1.5,
                          maxWidth: '80%',
                          borderRadius: message.isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: message.isUser
                            ? 'rgba(255, 255, 255, 0.9)'
                            : 'rgba(255, 255, 255, 0.15)',
                          backdropFilter: 'blur(10px)',
                          color: message.isUser ? 'text.primary' : 'white',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                          {message.text}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem', mt: 0.5, display: 'block' }}>
                          {message.time}
                        </Typography>
                      </Paper>
                    </Box>
                  </motion.div>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>

      {/* Charts Demo Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box textAlign="center" sx={{ mb: 8 }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 600 }}>
              {t('landing:demo.charts.title')}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
              {t('landing:demo.charts.description')}
            </Typography>
          </motion.div>
        </Box>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <ChartSection
            monthlyData={mockMonthlyData}
            categoryData={mockExpenseData}
            isLoading={false}
            userCurrency="USD"
            totalIncome={3700}
            totalExpenses={2850}
            transactionCount={25}
          />
        </motion.div>
      </Container>

      {/* Multi-User Context Demo */}
      <Box sx={{ py: 8, background: 'linear-gradient(135deg, rgba(69, 184, 215, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" sx={{ mb: 8 }}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Typography variant="h3" gutterBottom sx={{ fontWeight: 600 }}>
                {t('landing:demo.collaborative.title')}
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '700px', mx: 'auto' }}>
                {t('landing:demo.collaborative.description')}
              </Typography>
            </motion.div>
          </Box>

          {/* Context Carousel */}
          <Box sx={{ maxWidth: '700px', mx: 'auto', position: 'relative', display: 'flex', alignItems: 'center', gap: 3 }}>
            {/* Left Arrow */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <motion.div 
                whileHover={{ scale: 1.05, x: -2 }} 
                whileTap={{ scale: 0.95 }}
              >
                <Box
                  onClick={prevContext}
                  sx={{
                    width: 56,
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
                      transform: 'translateX(-2px)',
                    },
                  }}
                >
                  <ChevronLeftIcon 
                    sx={{ 
                      fontSize: 32, 
                      color: 'rgba(69, 184, 215, 0.8)',
                      filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2))'
                    }} 
                  />
                </Box>
              </motion.div>
            </Box>

            {/* Chat Card Container */}
            <Box sx={{ flex: 1, maxWidth: '600px' }}>

              {/* Context Card */}
              <motion.div
                key={`${currentContext.id}-${contextKey}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Card
                  sx={{
                    height: 480,
                    background: currentContext.gradient,
                    borderRadius: '20px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <CardContent sx={{ p: 0, height: '100%' }}>
                    {/* Header */}
                    <Box sx={{ p: 3, borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                          {currentContext.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                          {activeContext + 1} / {contextScenarios.length}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        {currentContext.subtitle}
                      </Typography>
                    </Box>
                    
                    {/* Messages */}
                    <Box sx={{ p: 2, height: 'calc(100% - 160px)', overflowY: 'auto' }}>
                      {currentContext.messages.map((message, index) => (
                        <motion.div
                          key={`${message.id}-${contextKey}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.3 }}
                        >
                          <Box sx={{ mb: 2, display: 'flex', justifyContent: message.isUser ? 'flex-end' : 'flex-start' }}>
                            <Paper
                              sx={{
                                p: 1.5,
                                maxWidth: '85%',
                                borderRadius: message.isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                background: message.isUser
                                  ? 'rgba(255, 255, 255, 0.95)'
                                  : 'rgba(255, 255, 255, 0.15)',
                                color: message.isUser ? 'text.primary' : 'white',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                              }}
                            >
                              {message.isUser && (
                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                  {(message as any).user}
                                </Typography>
                              )}
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                {message.text}
                              </Typography>
                              <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem', mt: 0.5, display: 'block' }}>
                                {message.time}
                              </Typography>
                            </Paper>
                          </Box>
                        </motion.div>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Box>

            {/* Right Arrow */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <motion.div 
                whileHover={{ scale: 1.05, x: 2 }} 
                whileTap={{ scale: 0.95 }}
              >
                <Box
                  onClick={nextContext}
                  sx={{
                    width: 56,
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
                      transform: 'translateX(2px)',
                    },
                  }}
                >
                  <ChevronRightIcon 
                    sx={{ 
                      fontSize: 32, 
                      color: 'rgba(69, 184, 215, 0.8)',
                      filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2))'
                    }} 
                  />
                </Box>
              </motion.div>
            </Box>
          </Box>

            {/* Dots Indicator */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
              {contextScenarios.map((_, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Box
                    onClick={() => goToContext(index)}
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      background: index === activeContext 
                        ? 'linear-gradient(45deg, #45b8d7, #10b981)' 
                        : 'rgba(0, 0, 0, 0.2)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: index === activeContext 
                          ? 'linear-gradient(45deg, #45b8d7, #10b981)' 
                          : 'rgba(0, 0, 0, 0.4)',
                      },
                    }}
                  />
                </motion.div>
              ))}
            </Box>
          <Box sx={{ textAlign: 'center', mt: 8 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: '700px', mx: 'auto' }}>
                {t('landing:collaborative.description')}
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap', mb: 4 }}>
                {contextScenarios.map((scenario, index) => (
                  <motion.div
                    key={scenario.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Box 
                      sx={{ 
                        textAlign: 'center',
                        cursor: 'pointer',
                        p: 2,
                        borderRadius: '12px',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'rgba(69, 184, 215, 0.1)',
                          transform: 'translateY(-4px)',
                        },
                      }}
                      onClick={() => goToContext(index)}
                    >
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          mb: 1,
                          fontSize: index === activeContext ? '2.5rem' : '2rem',
                          transition: 'font-size 0.3s ease',
                        }}
                      >
                        {scenario.title.split(' ')[0]}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {scenario.title.split(' ').slice(1).join(' ')}
                      </Typography>
                    </Box>
                  </motion.div>
                ))}
              </Box>

              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/login')}
                sx={{
                  px: 4,
                  py: 1.5,
                  background: 'linear-gradient(45deg, #45b8d7, #10b981)',
                  borderRadius: '50px',
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: '0 8px 32px rgba(69, 184, 215, 0.3)',
                  '&:hover': {
                    boxShadow: '0 12px 40px rgba(69, 184, 215, 0.4)',
                  },
                }}
              >
{t('landing:collaborative.button')}
              </Button>
            </motion.div>
          </Box>
        </Container>
      </Box>

      {/* Trust/Social Proof Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h4" textAlign="center" gutterBottom sx={{ mb: 6, fontWeight: 600 }}>
          {t('landing:trust.title')}
        </Typography>
        
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} sm={4} textAlign="center">
            <Box>
              <SecurityIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {t('landing:trust.security.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('landing:trust.security.description')}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={4} textAlign="center">
            <Box>
              <SpeedIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {t('landing:trust.speed.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('landing:trust.speed.description')}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={4} textAlign="center">
            <Box>
              <CloudIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {t('landing:trust.multiplatform.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('landing:trust.multiplatform.description')}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', mb: 4 }}>
            {[
              { icon: <PhoneIcon />, name: 'Telegram' },
              { icon: <PhoneIcon />, name: 'WhatsApp' },
              { icon: <PhotoIcon />, name: 'Web' },
            ].map((platform, index) => (
              <motion.div
                key={platform.name}
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 3,
                  delay: index * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Chip
                  icon={platform.icon}
                  label={platform.name}
                  variant="outlined"
                  sx={{
                    py: 2,
                    px: 1,
                    fontSize: '0.9rem',
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    '&:hover': {
                      background: 'rgba(69, 184, 215, 0.1)',
                    },
                  }}
                />
              </motion.div>
            ))}
          </Box>
        </Box>
      </Container>

      {/* FAQ Section */}
      <Box sx={{ py: 8, background: 'rgba(69, 184, 215, 0.02)' }}>
        <Container maxWidth="md">
          <Typography variant="h3" textAlign="center" gutterBottom sx={{ mb: 6, fontWeight: 600 }}>
            {t('landing:faq.title')}
          </Typography>

          <Box>
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Accordion
                  expanded={expandedFAQ === `panel${index}`}
                  onChange={handleFAQChange(`panel${index}`)}
                  sx={{
                    mb: 2,
                    borderRadius: '12px !important',
                    '&:before': {
                      display: 'none',
                    },
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <AccordionSummary
                    expandIcon={
                      <motion.div
                        animate={{
                          rotate: expandedFAQ === `panel${index}` ? 180 : 0,
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <ExpandMoreIcon />
                      </motion.div>
                    }
                    sx={{
                      '&.Mui-expanded': {
                        minHeight: 48,
                      },
                      '& .MuiAccordionSummary-content': {
                        '&.Mui-expanded': {
                          margin: '12px 0',
                        },
                      },
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {faq.question}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      {faq.answer}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </motion.div>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Final CTA Section */}
      <Box
        sx={{
          py: 12,
          background: 'linear-gradient(135deg, #45b8d7 0%, #10b981 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated background elements */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.1 }}>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -20, 0],
                rotate: [0, 360],
              }}
              transition={{
                duration: 10 + i * 2,
                repeat: Infinity,
                delay: i * 2,
              }}
              style={{
                position: 'absolute',
                left: `${20 + i * 15}%`,
                top: `${20 + (i % 2) * 40}%`,
                fontSize: '2rem',
              }}
            >
              💰
            </motion.div>
          ))}
        </Box>

        <Container maxWidth="md" sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
              {t('landing:cta.title')}
            </Typography>
            
            <Typography variant="h6" sx={{ mb: 6, opacity: 0.9, maxWidth: '600px', mx: 'auto' }}>
              {t('landing:cta.description')}
            </Typography>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/login')}
                sx={{
                  px: 6,
                  py: 2.5,
                  fontSize: '1.2rem',
                  background: 'white',
                  color: 'primary.main',
                  borderRadius: '50px',
                  textTransform: 'none',
                  fontWeight: 700,
                  boxShadow: '0 8px 32px rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.95)',
                    boxShadow: '0 12px 40px rgba(255, 255, 255, 0.4)',
                  },
                }}
              >
{t('landing:cta.button')}
              </Button>
            </motion.div>

            <Typography variant="body2" sx={{ mt: 3, opacity: 0.8 }}>
              {t('landing:cta.guarantee')}
            </Typography>
          </motion.div>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;