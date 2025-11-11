import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8adfff',
    },
    secondary: {
      main: '#c792ff',
    },
    background: {
      default: '#050915',
      paper: '#0b1628',
    },
    text: {
      primary: '#ecf5ff',
      secondary: '#a8b2d1',
    },
  },
  typography: {
    fontFamily: `'Inter', 'Space Grotesk', 'Helvetica Neue', 'Arial', sans-serif`,
    h3: {
      fontWeight: 600,
      letterSpacing: '0.08em',
    },
    h5: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(135deg, rgba(13,27,57,0.9), rgba(8,12,28,0.95))',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(8px)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
})

export default theme
