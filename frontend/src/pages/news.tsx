import { useState, useEffect } from 'react';
import Head from 'next/head';
import { getNews, NewsItem } from '@/lib/api';

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
    >
      <div className="flex gap-4 p-4">
        {item.thumbnail && (
          <img
            src={item.thumbnail}
            alt=""
            className="w-24 h-16 md:w-32 md:h-20 object-cover rounded flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm md:text-base font-semibold text-gray-900 line-clamp-2 mb-1">
            {item.title}
          </h3>
          <p className="text-xs text-gray-500 line-clamp-2 hidden md:block mb-2">
            {item.summary}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="font-medium text-gray-500">{item.source}</span>
            <span>&middot;</span>
            <span>{item.datetime}</span>
          </div>
        </div>
      </div>
    </a>
  );
}

function NewsCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="w-24 h-16 md:w-32 md:h-20 bg-gray-200 rounded flex-shrink-0" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-full mb-2 hidden md:block" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async (pageNum: number, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await getNews(pageNum, 20);
      if (res.items.length === 0) {
        setHasMore(false);
      } else {
        setNews((prev) => (append ? [...prev, ...res.items] : res.items));
      }
    } catch {
      setError('뉴스를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchNews(1);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNews(nextPage, true);
  };

  return (
    <>
      <Head>
        <title>증시 뉴스 - KR Stock Lab</title>
        <meta name="description" content="최신 증시 뉴스 및 시장 이슈" />
      </Head>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">증시 뉴스</h1>
          <button
            onClick={() => {
              setPage(1);
              fetchNews(1);
            }}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            새로고침
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* News List */}
        <div className="space-y-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <NewsCardSkeleton key={i} />)
            : news.map((item, i) => <NewsCard key={`${item.link}-${i}`} item={item} />)}
        </div>

        {/* Load More */}
        {!loading && hasMore && news.length > 0 && (
          <div className="text-center py-4">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
            >
              {loadingMore ? '로딩 중...' : '더 보기'}
            </button>
          </div>
        )}

        {!loading && news.length === 0 && !error && (
          <div className="text-center py-10 text-gray-500">
            뉴스가 없습니다.
          </div>
        )}
      </div>
    </>
  );
}
