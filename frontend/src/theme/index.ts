import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface TypographyVariants {
    brand: React.CSSProperties;
    navigation: React.CSSProperties;
    tagline: React.CSSProperties;
    numeric: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    brand?: React.CSSProperties;
    navigation?: React.CSSProperties;
    tagline?: React.CSSProperties;
    numeric?: React.CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    brand: true;
    navigation: true;
    tagline: true;
    numeric: true;
  }
}

const theme = createTheme({
  palette: {
    primary: {
      main: '#45b8d7', // Brand blue
      light: '#7dd3e8',
      dark: '#2e7a94',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f50057',
      light: '#ff5983',
      dark: '#bb002f',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    success: {
      main: '#4caf50',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
  },
  typography: {
    fontFamily: '"Montaga", serif',
    brand: {
      fontFamily: '"Playwrite DE SAS", cursive',
      fontWeight: 400,
      fontSize: '2.2rem',
      color: '#ffffff',
    },
    navigation: {
      fontFamily: '"Montaga", serif',
      fontWeight: 400,
      fontSize: '1.125rem',
      color: '#ffffff',
    },
    tagline: {
      fontFamily: '"Montaga", serif',
      fontWeight: 700,
      fontSize: '0.875rem',
      color: '#ffffff',
      opacity: 0.9,
      fontStyle: 'italic',
    },
    numeric: {
      fontFamily: '"Nuosu SIL", sans-serif',
      fontWeight: 400,
      fontStyle: 'normal',
    },
    h1: {
      fontWeight: 500,
    },
    h2: {
      fontWeight: 500,
    },
    h3: {
      fontWeight: 500,
    },
    h4: {
      fontWeight: 500,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

export default theme;