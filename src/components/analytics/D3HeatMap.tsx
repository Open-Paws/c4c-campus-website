/**
 * D3HeatMap Component
 * Agent 4: Visualization & Interaction Expert
 *
 * Interactive heat map visualization using D3.js
 * Shows engagement patterns by day of week and hour of day
 */

import * as d3 from 'd3';
import React, { useEffect, useRef, useState } from 'react';

interface HeatMapCell {
  day: number;      // 0-6 (Sunday-Saturday)
  hour: number;     // 0-23
  value: number;    // Engagement metric (unique users, events, etc.)
  label?: string;
}

interface Props {
  data: HeatMapCell[];
  width?: number;
  height?: number;
  colorScheme?: 'blues' | 'reds' | 'greens' | 'viridis' | 'plasma';
  onCellClick?: (cell: HeatMapCell) => void;
  title?: string;
}

export default function D3HeatMap({
  data,
  width = 900,
  height = 350,
  colorScheme = 'blues',
  onCellClick,
  title = 'Student Engagement by Day & Hour'
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: HeatMapCell } | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 60, right: 30, bottom: 80, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleBand()
      .domain(d3.range(0, 24).map(String))
      .range([0, innerWidth])
      .padding(0.05);

    const yScale = d3.scaleBand()
      .domain(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
      .range([0, innerHeight])
      .padding(0.05);

    const maxValue = d3.max(data, d => d.value) || 100;
    const colorScale = d3.scaleSequential()
      .domain([0, maxValue])
      .interpolator(getColorInterpolator(colorScheme));

    // Draw cells
    const cells = g.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => xScale(String(d.hour)) || 0)
      .attr('y', d => yScale(getDayName(d.day)) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.value))
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .style('opacity', 0)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke', '#000')
          .attr('stroke-width', 2)
          .style('opacity', 1);

        const rect = (event.target as SVGRectElement).getBoundingClientRect();
        setTooltip({
          x: rect.left + rect.width / 2,
          y: rect.top,
          data: d
        });
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke', 'none')
          .style('opacity', 1);

        setTooltip(null);
      })
      .on('click', (_event, d) => {
        if (onCellClick) {
          onCellClick(d);
        }
      });

    // Animate cells in
    cells.transition()
      .duration(600)
      .delay((_d, i) => i * 5)
      .style('opacity', 1);

    // X-axis (hours)
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale));

    xAxis.selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '11px');

    // Y-axis (days)
    const yAxis = g.append('g')
      .call(d3.axisLeft(yScale));

    yAxis.selectAll('text')
      .style('font-size', '12px');

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .style('fill', 'currentColor')
      .text(title);

    // X-axis label
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '13px')
      .style('fill', 'currentColor')
      .text('Hour of Day');

    // Y-axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '13px')
      .style('fill', 'currentColor')
      .text('Day of Week');

    // Legend
    const legendWidth = 200;
    const legendHeight = 10;
    const legendX = width - margin.right - legendWidth;
    const legendY = 20;

    const legendScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d3.format('.0f'));

    const legend = svg.append('g')
      .attr('transform', `translate(${legendX},${legendY})`);

    // Legend gradient
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'heatmap-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%');

    gradient.selectAll('stop')
      .data(d3.range(0, 1.1, 0.1))
      .enter()
      .append('stop')
      .attr('offset', d => `${d * 100}%`)
      .attr('stop-color', d => colorScale(d * maxValue));

    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#heatmap-gradient)');

    legend.append('g')
      .attr('transform', `translate(0,${legendHeight})`)
      .call(legendAxis)
      .selectAll('text')
      .style('font-size', '10px');

  }, [data, width, height, colorScheme, onCellClick, title]);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="mx-auto"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      ></svg>

      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl text-sm pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 80,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="font-bold mb-1">
            {getDayName(tooltip.data.day)}, {formatHour(tooltip.data.hour)}
          </div>
          <div className="text-gray-200">
            Engagement: <span className="font-semibold">{tooltip.data.value}</span> {tooltip.data.label || 'users'}
          </div>
          {tooltip.data.label && (
            <div className="text-gray-300 text-xs mt-1">{tooltip.data.label}</div>
          )}
        </div>
      )}
    </div>
  );
}

function getDayName(day: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day];
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:00 ${ampm}`;
}

function getColorInterpolator(scheme: string) {
  switch (scheme) {
    case 'reds': return d3.interpolateReds;
    case 'greens': return d3.interpolateGreens;
    case 'viridis': return d3.interpolateViridis;
    case 'plasma': return d3.interpolatePlasma;
    default: return d3.interpolateBlues;
  }
}
