/**
 * ManagerKaizen — "Impact dashboard".
 *
 * A plant manager funds Kaizen and needs one question answered: is this
 * returning money, and where is it stuck? So the board never mixes
 * proven money with promised money — realized savings and pipeline
 * forecast sit in separate tiles and render as separate bars (solid vs.
 * hatched) on every chart. Adding them together is the single easiest
 * way to make a suggestion scheme look better than it is.
 *
 * Sections:
 *   1. Impact summary   realized · pipeline · ROI · ideas implemented
 *   2. Savings by category  realized (solid) + forecast (hatched)
 *   3. Implementation funnel with the bottleneck called out
 *   4. Top 10 ideas by money, banded against their own forecast
 *   5. Trends: submissions, average saving, cycle time
 *
 * Props:
 * - metrics ({ impact, byCategory, funnel, topIdeas, trend, cycleTime })
 * - loading (bool)
 */

import React, { useState } from 'react';
import {
  AlertTriangle, ArrowUpRight, CheckCircle2, Coins, Gauge, Layers, TrendingUp,
} from 'lucide-react';
import DashboardKpiCard from '../dashboard/DashboardKpiCard.jsx';
import DashboardChart, { Sparkline } from '../dashboard/DashboardChart.jsx';
import KaizenStatusBadge from './KaizenStatusBadge.jsx';
import {
  formatInr,
  formatInrCompact,
  formatPct,
} from '../../utils/kaizenMetrics.js';

const BAND_TONE = { over: 'ok', on: 'warning', under: 'danger' };
const BAND_LABEL = { over: 'Beat forecast', on: 'On track', under: 'Under forecast' };

export default function ManagerKaizen({ metrics, loading = false }) {
  const impact = metrics?.impact || {};
  const byCategory = metrics?.byCategory || [];
  const funnel = metrics?.funnel || { stages: [], total: 0 };
  const topIdeas = metrics?.topIdeas || [];
  const trend = metrics?.trend || [];
  const cycleTime = metrics?.cycleTime || {};

  const [openCategory, setOpenCategory] = useState(null);

  const barMax = Math.max(1, ...byCategory.map((row) => row.total));
  const funnelMax = Math.max(1, ...funnel.stages.map((stage) => stage.count));
  const submissionSeries = trend.map((month) => month.count);
  const savingSeries = trend.map((month) => month.avgSaving);
  const monthsWithSavings = savingSeries.filter((value) => value != null);

  return (
    <div className="rd-board kz-board kz-board-manager" data-testid="manager-kaizen" data-loading={loading ? 'true' : 'false'}>

      {/* ---------- 1. Impact summary ---------- */}
      <section className="rd-kpi-row" aria-label="Kaizen impact KPIs">
        <DashboardKpiCard
          label="Total realized savings"
          icon={Coins}
          tone={impact.realized > 0 ? 'ok' : ''}
          value={impact.realizedCount ? formatInrCompact(impact.realized) : 'Nothing verified yet'}
          hint={
            impact.realizedCount
              ? `${impact.realizedCount} verified idea${impact.realizedCount === 1 ? '' : 's'} · ${formatInrCompact(impact.spend)} spent`
              : 'Savings count only once an idea is verified'
          }
          data-testid="kz-kpi-realized"
        />
        <DashboardKpiCard
          label="Pipeline forecast"
          icon={Layers}
          tone="info"
          value={formatInrCompact(impact.forecast || 0)}
          hint={`${impact.forecastCount ?? 0} idea${impact.forecastCount === 1 ? '' : 's'} approved or in trial — not yet proven`}
          data-testid="kz-kpi-pipeline"
        />
        <DashboardKpiCard
          label="ROI this year"
          icon={TrendingUp}
          tone={impact.roiThisYearPct == null ? '' : impact.roiThisYearPct >= 100 ? 'ok' : impact.roiThisYearPct >= 0 ? 'warning' : 'danger'}
          value={formatPct(impact.roiThisYearPct, 'No spend booked yet')}
          hint={
            impact.netBenefit == null
              ? 'Realized savings against money actually spent'
              : `${formatInrCompact(impact.netBenefit)} net benefit lifetime`
          }
          data-testid="kz-kpi-roi-year"
        />
        <DashboardKpiCard
          label="Ideas implemented"
          icon={CheckCircle2}
          value={impact.implemented ?? 0}
          hint={`${impact.standardised ?? 0} written into a standard · ${impact.total ?? 0} submitted all time`}
          data-testid="kz-kpi-implemented"
        />
      </section>

      {/* ---------- 2 & 3. Category savings + funnel ---------- */}
      <div className="rd-split">
        <DashboardChart
          title="Savings by category"
          subtitle="Solid = realized · hatched = forecast"
          caption={`${byCategory.length} categor${byCategory.length === 1 ? 'y' : 'ies'}`}
        >
          {byCategory.length ? (
            <div className="kz-catbars" data-testid="kaizen-category-bars">
              {byCategory.map((row) => {
                const expanded = openCategory === row.category;
                return (
                  <div className="kz-catbar" key={row.category}>
                    <button
                      type="button"
                      className="kz-catbar-row"
                      aria-expanded={expanded}
                      onClick={() => setOpenCategory(expanded ? null : row.category)}
                    >
                      <span className="kz-catbar-label" title={row.label}>{row.label}</span>
                      <span className="kz-catbar-track">
                        <span
                          className="kz-catbar-fill realized"
                          style={{ width: `${(row.realized / barMax) * 100}%` }}
                          title={`Realized ${formatInr(row.realized)}`}
                        />
                        <span
                          className="kz-catbar-fill forecast"
                          style={{ width: `${(row.forecast / barMax) * 100}%` }}
                          title={`Forecast ${formatInr(row.forecast)}`}
                        />
                      </span>
                      <b className="kz-catbar-value">{formatInrCompact(row.total)}</b>
                    </button>

                    {expanded && (
                      <ul className="kz-catbar-detail">
                        {row.ideas.map((idea) => (
                          <li key={idea.id}>
                            <span>{idea.title}</span>
                            <b className={idea.realized ? 'ok' : ''}>
                              {formatInrCompact(idea.saving)}
                              <small>{idea.realized ? 'realized' : 'forecast'}</small>
                            </b>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
              <p className="rd-hint">Click a category to see the ideas behind the bar.</p>
            </div>
          ) : (
            <p className="rd-empty">No idea carries a savings figure yet.</p>
          )}
        </DashboardChart>

        <DashboardChart
          title="Implementation funnel"
          subtitle="Where ideas are sitting"
          caption={`${funnel.total} in flight`}
        >
          <div className="kz-funnel" data-testid="kaizen-funnel">
            {funnel.stages.map((stage) => {
              const isBottleneck = funnel.bottleneck?.key === stage.key;
              return (
                <div className={`kz-funnel-row ${isBottleneck ? 'bottleneck' : ''}`} key={stage.key}>
                  <span className="kz-funnel-label">{stage.label}</span>
                  <span className="kz-funnel-track">
                    <span
                      className="kz-funnel-fill"
                      style={{ width: `${Math.max(3, (stage.count / funnelMax) * 100)}%` }}
                    />
                  </span>
                  <b className="kz-funnel-count">{stage.count}</b>
                </div>
              );
            })}
          </div>

          {funnel.bottleneck ? (
            <p className="rd-hint warning" data-testid="kaizen-bottleneck">
              <AlertTriangle size={13} aria-hidden="true" />
              {' '}{funnel.bottleneck.count} ideas are stacked at &ldquo;{funnel.bottleneck.label}&rdquo; —
              {' '}{funnel.bottleneck.pct}% of everything in flight. That stage is the constraint.
            </p>
          ) : (
            <p className="rd-hint ok">No stage is holding a disproportionate share. Flow looks even.</p>
          )}
          {funnel.rejected > 0 && (
            <p className="rd-hint">{funnel.rejected} idea{funnel.rejected === 1 ? '' : 's'} rejected — excluded from every figure above.</p>
          )}
        </DashboardChart>
      </div>

      {/* ---------- 4. Top ideas ---------- */}
      <DashboardChart
        title="Top savings ideas"
        subtitle="Proven money ranks above forecast money"
        caption="Top 10"
        action={<a className="rd-link" href="records.html">All records <ArrowUpRight size={13} /></a>}
      >
        {topIdeas.length ? (
          <div className="rd-table-wrap">
            <table className="rd-table kz-table" data-testid="kaizen-top-ideas">
              <thead>
                <tr>
                  <th scope="col">Idea</th>
                  <th scope="col">Submitter</th>
                  <th scope="col">Category</th>
                  <th scope="col">Cost</th>
                  <th scope="col">Estimated</th>
                  <th scope="col">Realized</th>
                  <th scope="col">ROI</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {topIdeas.map((row) => (
                  <tr key={row.id} className={row.band ? `kz-row-${BAND_TONE[row.band]}` : ''}>
                    <th scope="row">
                      {row.title}
                      <small className="kz-cell-sub">{row.id}</small>
                    </th>
                    <td data-label="Submitter">{row.submitter}</td>
                    <td data-label="Category">{row.categoryLabel}</td>
                    <td data-label="Cost" className="rd-num">{row.cost > 0 ? formatInrCompact(row.cost) : '—'}</td>
                    <td data-label="Estimated" className="rd-num">{row.estimate > 0 ? formatInrCompact(row.estimate) : '—'}</td>
                    <td data-label="Realized" className="rd-num">
                      {row.realized == null ? <span className="kz-muted">pending</span> : formatInrCompact(row.realized)}
                      {row.band && <small className={`kz-cell-sub ${BAND_TONE[row.band]}`}>{BAND_LABEL[row.band]}</small>}
                    </td>
                    <td data-label="ROI" className="rd-num">{row.roiPct == null ? '—' : `${row.roiPct}%`}</td>
                    <td data-label="Status"><KaizenStatusBadge status={row.status} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rd-empty">No ideas to rank yet.</p>
        )}
      </DashboardChart>

      {/* ---------- 5. Trends ---------- */}
      <DashboardChart title="Trends" subtitle="Last six months" caption="Momentum, value and speed">
        <div className="kz-trends">
          <div className="kz-trend">
            <span className="kz-trend-label">Ideas submitted / month</span>
            <Sparkline points={submissionSeries} />
            <strong>{submissionSeries.reduce((sum, value) => sum + value, 0)} total</strong>
            <small>{trend.map((month) => month.label).join(' · ')}</small>
          </div>

          <div className="kz-trend">
            <span className="kz-trend-label">Average saving / verified idea</span>
            <Sparkline points={savingSeries} tone="ok" />
            <strong>
              {monthsWithSavings.length
                ? formatInrCompact(
                  Math.round(monthsWithSavings.reduce((sum, value) => sum + value, 0) / monthsWithSavings.length),
                )
                : '—'}
            </strong>
            <small>{monthsWithSavings.length ? 'Mean of the months that closed an idea' : 'Nothing verified in the window'}</small>
          </div>

          <div className="kz-trend">
            <span className="kz-trend-label"><Gauge size={12} aria-hidden="true" /> Cycle time to standard</span>
            <strong className="kz-trend-big">
              {cycleTime.avgDays == null ? '—' : `${cycleTime.avgDays} days`}
            </strong>
            <small>
              {cycleTime.sampleSize
                ? `Submission to standardisation · ${cycleTime.fastestDays}–${cycleTime.slowestDays} day range over ${cycleTime.sampleSize} idea${cycleTime.sampleSize === 1 ? '' : 's'}`
                : 'No idea has completed the full cycle yet'}
            </small>
          </div>
        </div>
      </DashboardChart>
    </div>
  );
}
