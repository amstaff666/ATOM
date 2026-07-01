import type { AppProps } from "next/app";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { SessionProvider } from "next-auth/react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import "../styles/globals.css";
import Layout from "../components/layout/Layout";
import { ToastProvider } from "../components/ui/use-toast";
const routesWithOwnLayout = [
  "/workflows/builder",
  "/workflows/editor",
  "/settings/ai",
  "/dashboard/risk",
  "/dashboard/owner",
  "/dashboard/forensics",
];
function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const hasOwnLayout = routesWithOwnLayout.some((route) =>
    router.pathname === route || router.pathname.startsWith(`${route}/`),
  );

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <SessionProvider session={(pageProps as any).session}>
      <ChakraProvider value={defaultSystem}>
        <ToastProvider>
          {hasOwnLayout ? (
            <Component {...pageProps} />
          ) : (
            <Layout>
              <Component {...pageProps} />
            </Layout>
          )}
        </ToastProvider>
      </ChakraProvider>
    </SessionProvider>
  );
}
export default MyApp;
