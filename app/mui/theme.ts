import * as colors from '@mui/material/colors';
import { createTheme } from '@mui/material/styles';

export const getDesignTokens = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            // palette values for light mode
            text: {
              primary: '#000',
            },
            border: {
              main: 'rgba(0, 0, 0, 0.23)',
            },
            primary: {
              // Use hue from colors or hex
              // main: colors.indigo['500'],
              // Uncomment to specify light/dark
              // shades instead of automatically
              // calculating from above value.
              //light: "#4791db",
              //dark: "#115293",
              // INFO: official brand colors
              // main: '#5AA3F2',
              main: '#552EF0',
            },
            secondary: {
              // main: colors.pink['500'],
              // INFO: official brand colors
              // main: '#B48CFF',
              main: '#552EF0',
            },
            background: {
              // Background for <body>
              // and <Section color="default">
              // default: '#fff',
              default: '#CECECE',
              // backgroundColor: "#F9F9F9",
              // Background for elevated
              // components (<Card>, etc)
              // primary: colors.grey['100'],
              paper: colors.grey['200'],
              // secondary: colors.grey['400'],
              // dark: colors.grey['500'],
            },
          }
        : {
            // palette values for dark mode
            text: {
              primary: '#fff',
            },
            border: {
              main: 'rgba(255, 255, 255, 0.23)',
            },
            primary: {
              // Same as in light but we could
              // adjust color hue if needed
              // main: colors.indigo['500'],
              // tabs: colors.pink['400'],
              // INFO: official brand colors
              // main: '#5AA3F2',
              main: '#552EF0',
            },
            secondary: {
              // main: colors.pink['500'],
              // INFO: official brand colors
              main: '#B48CFF',
            },
            background: {
              // default: colors.grey['900'],
              // paper: colors.grey['700'],
              // primary: colors.grey['800'],
              // secondary: colors.grey['900'],
              // dark: colors.grey['A400'],
              // INFO: official brand colors
              default: '#161D2B',
            },
          }),
    },
    // Values for both themes
    // Overriding the default typography
    typography: {
      fontSize: 14,
      fontFamily: '"IBM Plex Sans", "Helvetica", "Arial", sans-serif',
      // Uncomment to make button lowercase
      // button: { textTransform: "none" },
    },
    components: {
      // Global styles
      MuiCssBaseline: {
        styleOverrides: {
          // it doesn't recognize the '@global' key like in JSS
          // '@global': {
          'body#remix-extension': {
            // Flex column that is height
            // of viewport so that footer
            // can push self to bottom by
            // with auto margin-top
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            // Prevent child elements from
            // shrinking when content
            // is taller than the screen
            // (quirk of flex parent)
            '& > *': {
              flexShrink: 0,
            },
          },
          // },
        },
      },
    },
    // Overriding the default breakpoints
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1200,
        xl: 1920,
      },
    },
  });
