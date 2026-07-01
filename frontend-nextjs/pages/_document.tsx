import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
    return (
        <Html lang="et">
            <Head>
                <title>Restart-CRM</title>
                <meta name="description" content="Restart-CRM — Annaator halduri platvorm. Klientide, dokumentide ja rahastuse haldus." />
                <meta property="og:title" content="Restart-CRM" />
                <meta property="og:description" content="Restart-CRM — Annaator halduri platvorm" />
                <meta property="og:type" content="website" />
            </Head>
            <body className="antialiased">
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}
