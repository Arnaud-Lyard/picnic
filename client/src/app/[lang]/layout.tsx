import '../globals.css';
import { Metadata } from 'next';
import Favicon from '~/public/assets/images/favicon.ico';
import { getDictionary } from './dictionaries';
import DictionaryProvider from '../../providers/dictionary-provider';

export function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Metadata {
  const icons = [{ rel: 'icon', url: Favicon.src }];
  const title =
    params.lang === 'fr'
      ? 'Veille technologique | Prochainweb'
      : 'Technology Watch | Prochainweb';

  const description =
    params.lang === 'fr'
      ? 'Découvrir les évolutions des langages de programmation, les nouveaux frameworks, les outils, les bonnes pratiques et les tendances du web.'
      : 'Discover the evolutions of programming languages, new frameworks, tools, best practices and web trends.';

  const openGraph = {
    title,
    description,
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'Prochainweb',
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/cover.png`,
        width: 1200,
        height: 630,
        alt: 'Prochainweb',
      },
    ],
  };

  return {
    icons,
    title,
    description,
    openGraph,
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  const dictionary = await getDictionary(params.lang);

  return (
    <html lang={params.lang}>
      <body>
        <DictionaryProvider dictionary={dictionary}>
          {children}
        </DictionaryProvider>
      </body>
    </html>
  );
}
