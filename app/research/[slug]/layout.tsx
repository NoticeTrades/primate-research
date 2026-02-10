import type { Metadata } from 'next';
import { getArticleBySlug, generateSlug } from '../../../data/research';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.primatetrading.com';
  const articleUrl = `${baseUrl}/research/${slug}`;
  const imageUrl = article.sections?.[0]?.images?.[0] 
    ? `${baseUrl}${article.sections[0].images[0]}`
    : `${baseUrl}/og-image.png`;

  return {
    title: article.title,
    description: article.description,
    keywords: article.tags || [],
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      url: articleUrl,
      publishedTime: article.date || undefined,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
      images: [imageUrl],
    },
    alternates: {
      canonical: articleUrl,
    },
  };
}

export default function ResearchArticleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

