import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { VietnamFlagIcon, CountryCellBadge } from '@/components/common/vietnam-flag';
import { JapanFlagIcon, USAFlagIcon } from '@/components/common/japan-flag';

describe('Flag Icons and CountryCellBadge', () => {
  it('renders VietnamFlagIcon without border and with wave animation', () => {
    const { container } = render(<VietnamFlagIcon />);
    const flagWrapper = container.querySelector('.animate-flag-wave');
    expect(flagWrapper).not.toBeNull();
    // Bỏ border Graphite MES
    expect(flagWrapper?.className).not.toContain('border-border');
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toBe('Cờ Việt Nam');
  });

  it('renders JapanFlagIcon without border', () => {
    const { container } = render(<JapanFlagIcon />);
    const flagWrapper = container.querySelector('.animate-flag-wave');
    expect(flagWrapper).not.toBeNull();
    expect(flagWrapper?.className).not.toContain('border-border');
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toBe('Cờ Nhật Bản');
  });

  it('renders USAFlagIcon without border', () => {
    const { container } = render(<USAFlagIcon />);
    const flagWrapper = container.querySelector('.animate-flag-wave');
    expect(flagWrapper).not.toBeNull();
    expect(flagWrapper?.className).not.toContain('border-border');
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toBe('Cờ Hoa Kỳ');
  });

  it('renders CountryCellBadge with Japan and USA representations correctly', () => {
    const { rerender } = render(<CountryCellBadge country="Japan" showText={true} />);
    expect(screen.getByText('JP')).toBeDefined();
    expect(screen.getByTitle('Japan (Nhật Bản)')).toBeDefined();

    rerender(<CountryCellBadge country="USA" showText={true} />);
    expect(screen.getByText('US')).toBeDefined();
    expect(screen.getByTitle('United States (Hoa Kỳ)')).toBeDefined();

    rerender(<CountryCellBadge country="Mỹ" showText={true} />);
    expect(screen.getByText('US')).toBeDefined();
  });

  it('renders CountryCellBadge with Vietnam when undefined or Vietnam', () => {
    render(<CountryCellBadge country={undefined} showText={true} />);
    expect(screen.getByText('VN')).toBeDefined();
  });
});
