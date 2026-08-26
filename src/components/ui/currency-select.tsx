'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Currency, CURRENCIES, searchCurrencies } from '@/data/currencies';
import { ChevronDown, Search, Check } from 'lucide-react';

interface CurrencySelectProps {
  value: string;
  onChange: (currencyCode: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CurrencySelect({
  value,
  onChange,
  disabled = false,
  className = '',
}: CurrencySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCurrency = useMemo(() => {
    const clean = String(value || '').trim().toUpperCase();
    return (
      CURRENCIES.find((c) => c.code === clean) ||
      CURRENCIES.find((c) => c.code === 'INR') ||
      CURRENCIES[0]
    );
  }, [value]);

  const filteredCurrencies = useMemo(() => {
    return searchCurrencies(search);
  }, [search]);

  // Click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Auto focus search input
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (curr: Currency) => {
    onChange(curr.code);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-[#d9d4cc] bg-white px-3 py-2 text-sm text-[#1f2937] hover:border-[#b8b3a8] focus:border-[#2490ef] focus:outline-none focus:ring-2 focus:ring-[#2490ef]/20 transition-all disabled:opacity-50"
      >
        <div className="flex items-center gap-2 truncate">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#eef6fd] text-xs font-bold text-[#1674c4]">
            {selectedCurrency.symbol}
          </span>
          <span className="font-semibold text-[#1f2937]">{selectedCurrency.code}</span>
          <span className="text-xs text-[#6b7280] truncate">- {selectedCurrency.name}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-[#9ca3af]" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[280px] rounded-lg border border-[#e5e2dc] bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
          {/* Search Bar */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#9ca3af]" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search currency (e.g. INR, ₹, USD, Euro)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-[#d9d4cc] bg-[#f8faf9] py-1.5 pl-8 pr-3 text-xs text-[#1f2937] placeholder:text-[#9ca3af] focus:border-[#2490ef] focus:outline-none focus:ring-1 focus:ring-[#2490ef]"
            />
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1 text-xs">
            {filteredCurrencies.length === 0 ? (
              <div className="p-3 text-center text-xs text-[#9ca3af]">No currency found</div>
            ) : (
              filteredCurrencies.map((c) => {
                const isSelected = c.code === selectedCurrency.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-[#eef6fd] text-[#1674c4] font-medium'
                        : 'hover:bg-[#f4f2ee] text-[#374151]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#f0f4f8] text-[11px] font-bold text-[#4b5563]">
                        {c.symbol}
                      </span>
                      <span className="font-semibold text-[#1f2937]">{c.code}</span>
                      <span className="text-[11px] text-[#6b7280] truncate">{c.name}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-[#1674c4] pl-1" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
