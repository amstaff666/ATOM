import React, { useState, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import type { AppProps } from "next/app";

import { ToastProvider } from "../components/ui/use-toast";
import { GlobalChatWidget } from "../components/GlobalChatWidget";
import "../styles/globals.css";

import Layout from "../components/layout/Layout";
import { WakeWordProvider } from "../contexts/WakeWordContext";
import { useCliHandler } from "../hooks/useCliHandler";
import { AuthTokenSync } from "../components/AuthTokenSync";

const TauriHooks = () => {
  useCliHandler();
  return null;
};

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const [mounted, setMounted] = useState(false);


  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SessionProvider session={session}>
      <AuthTokenSync />
      <TauriHooks />
      <ChakraProvider value={defaultSystem}>
        <ToastProvider>
          <WakeWordProvider>
            <Layout>
              <Component {...pageProps} />
            </Layout>
            {mounted && <GlobalChatWidget />}
          </WakeWordProvider>
        </ToastProvider>
      </ChakraProvider>
    </SessionProvider>
  );
}

export default MyApp;

