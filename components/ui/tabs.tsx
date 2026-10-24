'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  activeTab?: string;
  onChange?: (id: string) => void;
  className?: string;
}

export function Tabs({
  tabs,
  defaultTab,
  activeTab: controlledActiveTab,
  onChange,
  className,
}: TabsProps) {
  const [internalTab, setInternalTab] = React.useState(defaultTab || tabs[0]?.id);
  const isControlled = controlledActiveTab !== undefined;
  const currentTab = isControlled ? controlledActiveTab : internalTab;

  const handleSelect = (id: string) => {
    if (!isControlled) {
      setInternalTab(id);
    }
    onChange?.(id);
  };

  const activeContent = tabs.find((t) => t.id === currentTab)?.content;

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Tabs Header List */}
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex items-center gap-1 border-b border-border p-1 overflow-x-auto custom-scrollbar"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === currentTab;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              disabled={tab.disabled}
              onClick={() => handleSelect(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-[var(--radius-control)] px-4 py-2 text-sm font-semibold transition-all select-none whitespace-nowrap',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
                tab.disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
              )}
            >
              {tab.icon && <span className="h-4 w-4 shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel */}
      {activeContent && (
        <div
          role="tabpanel"
          id={`panel-${currentTab}`}
          aria-labelledby={`tab-${currentTab}`}
          className="focus-visible:outline-none animate-in fade-in duration-200"
        >
          {activeContent}
        </div>
      )}
    </div>
  );
}
