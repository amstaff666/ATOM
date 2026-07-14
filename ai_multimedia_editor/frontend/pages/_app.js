import * as React from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Create a light theme. Users can extend/customize later.
const theme = createTheme({
  palette: {
    mode: 'light'
  }
});

// Global application wrapper. Provides Material‑UI theme and meta tags.
export default function MyApp(props) {
  const { Component, pageProps } = props;
  return (
    <React.Fragment>
      <Head>
        <title>AI Multimedia Editor</title>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </React.Fragment>
  );
}

MyApp.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired
};