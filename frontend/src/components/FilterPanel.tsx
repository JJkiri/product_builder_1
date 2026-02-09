'use client';

import { Top10Params } from '@/lib/api';

interface FilterPanelProps {
  filters: Top10Params;
  onChange: (filters: Top10Params) => void;
}

export default function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const handleChange = (key: keyof Top10Params, value: string | number | undefined) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">필터 설정</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Market */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            시장
          </label>
          <select
            value={filters.market || 'ALL'}
            onChange={(e) => handleChange('market', e.target.value as Top10Params['market'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">전체</option>
            <option value="KOSPI">코스피</option>
            <option value="KOSDAQ">코스닥</option>
          </select>
        </div>

        {/* Min Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            최소 거래대금 (억원)
          </label>
          <input
            type="number"
            value={filters.min_value ?? ''}
            onChange={(e) => handleChange('min_value', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="예: 100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            정렬 기준
          </label>
          <select
            value={filters.sort_by || 'value'}
            onChange={(e) => handleChange('sort_by', e.target.value as Top10Params['sort_by'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="value">거래대금</option>
            <option value="weighted">거래대금 + 등락률</option>
          </select>
        </div>

        {/* Min Change % */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            최소 등락률 (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={filters.min_chg_pct ?? ''}
            onChange={(e) => handleChange('min_chg_pct', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="예: 0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Max Change % */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            최대 등락률 (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={filters.max_chg_pct ?? ''}
            onChange={(e) => handleChange('max_chg_pct', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="예: 30"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Min Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            최소 가격 (원)
          </label>
          <input
            type="number"
            value={filters.min_price ?? ''}
            onChange={(e) => handleChange('min_price', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="예: 1000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Max Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            최대 가격 (원)
          </label>
          <input
            type="number"
            value={filters.max_price ?? ''}
            onChange={(e) => handleChange('max_price', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="예: 100000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
