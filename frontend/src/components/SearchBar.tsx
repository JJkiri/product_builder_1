'use client';

import { useState, useEffect } from 'react';
import { getSymbols, Symbol } from '@/lib/api';

interface SearchBarProps {
  onSelect?: (symbol: Symbol) => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Symbol[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const symbols = await getSymbols(query);
        setResults(symbols.slice(0, 10));
        setIsOpen(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (symbol: Symbol) => {
    setQuery(`${symbol.name} (${symbol.code})`);
    setIsOpen(false);
    onSelect?.(symbol);
  };

  return (
    <div className="relative w-full max-w-md">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        placeholder="종목명 또는 종목코드 검색..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      {isOpen && results.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {results.map((symbol) => (
            <li
              key={symbol.code}
              onClick={() => handleSelect(symbol)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
            >
              <span className="font-medium">{symbol.name}</span>
              <span className="text-sm text-gray-500">
                {symbol.code} · {symbol.market}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
