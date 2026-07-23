import { useState } from 'react'
import MetricCard, { formatCurrency, formatPercent, formatCount, formatFreq } from './MetricCard'
import DetailTable from './DetailTable'
import ActionMetricsTable from './ActionMetricsTable'
import JsonViewer from './JsonViewer'
import { cn } from '../../../lib/utils'

const TABS = ['Overview', 'Performance', 'Messaging', 'Engagement', 'Creative', 'Targeting', 'Campaign & Ad Set', 'Raw JSON']

const MESSAGING_TYPES = [
  'onsite_conversion.messaging_welcome_message_view',
  'onsite_conversion.total_messaging_connection',
  'onsite_conversion.messaging_conversation_started_7d',
  'onsite_conversion.messaging_first_reply',
  'onsite_conversion.messaging_conversation_replied_7d',
  'onsite_conversion.messaging_user_depth_2_message_send',
  'onsite_conversion.messaging_user_depth_3_message_send',
  'onsite_conversion.messaging_user_depth_5_message_send',
  'onsite_conversion.messaging_block',
]

const ENGAGEMENT_TYPES = [
  'post_engagement', 'page_engagement', 'post_reaction', 'comment',
  'like', 'post', 'post_interaction_gross', 'post_interaction_net', 'video_view',
]

export default function AdDetailTabs({ ad }) {
  const [tab, setTab] = useState('Overview')
  const ins = ad._insights || {}
  const cr = ad.creative || {}
  const camp = ad.campaign || {}
  const adset = ad.adset || {}
  const actions = ins.actions || []
  const costPerAction = ins.cost_per_action_type || []

  return (
    <div className="border-t border-border-default bg-gray-50">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-border-default bg-white px-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'whitespace-nowrap px-3 py-2.5 text-[11px] font-medium border-b-2 transition',
              tab === t ? 'border-primary-600 text-primary-700' : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {tab === 'Overview' && <OverviewTab ad={ad} ins={ins} camp={camp} adset={adset} />}
        {tab === 'Performance' && <PerformanceTab ins={ins} />}
        {tab === 'Messaging' && <MessagingTab actions={actions} costPerAction={costPerAction} ins={ins} />}
        {tab === 'Engagement' && <EngagementTab actions={actions} costPerAction={costPerAction} />}
        {tab === 'Creative' && <CreativeTab cr={cr} ad={ad} />}
        {tab === 'Targeting' && <TargetingTab adset={adset} />}
        {tab === 'Campaign & Ad Set' && <CampaignTab camp={camp} adset={adset} />}
        {tab === 'Raw JSON' && <JsonViewer data={ad} />}
      </div>
    </div>
  )
}

function OverviewTab({ ad, ins, camp, adset }) {
  return (
    <DetailTable rows={[
      ['Ad Name', ad.name],
      ['Ad ID', ad.id],
      ['Configured Status', ad.configured_status],
      ['Effective Status', ad.effective_status],
      ['Created', ad.created_time],
      ['Updated', ad.updated_time],
      ['Campaign', camp.name],
      ['Ad Set', adset.name],
      ['Objective', camp.objective],
      ['Optimization Goal', adset.optimization_goal],
      ['Billing Event', adset.billing_event],
      ['CTA', ad.creative?.call_to_action_type],
      ['Destination', ad.creative?.link_url || ad.creative?.object_story_spec?.link_data?.link],
      ['Reporting Date Range', ins.date_start && ins.date_stop ? `${ins.date_start} → ${ins.date_stop}` : '—'],
    ]} />
  )
}

function PerformanceTab({ ins }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard label="Spend" value={ins.spend} format="currency" />
        <MetricCard label="Impressions" value={ins.impressions} format="count" />
        <MetricCard label="Reach" value={ins.reach} format="count" />
        <MetricCard label="Frequency" value={ins.frequency} format="freq" />
        <MetricCard label="Clicks" value={ins.clicks} format="count" />
        <MetricCard label="Unique Clicks" value={ins.unique_clicks} format="count" />
        <MetricCard label="Inline Link Clicks" value={ins.inline_link_clicks} format="count" />
        <MetricCard label="CTR" value={ins.ctr} format="percent" />
        <MetricCard label="Unique CTR" value={ins.unique_ctr} format="percent" />
        <MetricCard label="Inline Link Click CTR" value={ins.inline_link_click_ctr} format="percent" />
        <MetricCard label="CPC" value={ins.cpc} format="currency" />
        <MetricCard label="CPM" value={ins.cpm} format="currency" />
      </div>
    </div>
  )
}

function MessagingTab({ actions, costPerAction, ins }) {
  const msgFilter = (a) => a.action_type?.includes('messaging') || a.action_type?.includes('messaging')
  const msgActions = actions.filter(msgFilter)
  const otherMsg = actions.filter((a) => a.action_type?.includes('onsite_conversion') && !msgFilter(a))

  // Derived metrics
  const getVal = (type) => Number(actions.find((a) => a.action_type === type)?.value || 0)
  const welcome = getVal('onsite_conversion.messaging_welcome_message_view')
  const convStarted = getVal('onsite_conversion.messaging_conversation_started_7d')
  const firstReply = getVal('onsite_conversion.messaging_first_reply')
  const linkClicks = Number(ins.inline_link_clicks || 0)

  const getCost = (type) => Number(costPerAction.find((a) => a.action_type === type)?.value || 0)

  return (
    <div className="space-y-4">
      <ActionMetricsTable actions={msgActions} costPerAction={costPerAction} title="Messaging Actions" filterFn={() => true} />
      {otherMsg.length > 0 && (
        <ActionMetricsTable actions={otherMsg} costPerAction={costPerAction} title="Other Conversion Actions" filterFn={() => true} />
      )}

      {/* Derived Metrics */}
      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/30 p-3">
        <p className="text-[9px] font-semibold text-amber-700 uppercase mb-2">Derived Metrics <span className="font-normal">(Calculated from Meta API values)</span></p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 text-[10px]">
          <div>
            <span className="text-text-tertiary">Welcome→Conversation: </span>
            <span className="font-medium">{welcome > 0 ? formatPercent((convStarted / welcome) * 100) : '—'}</span>
          </div>
          <div>
            <span className="text-text-tertiary">Conversation→First Reply: </span>
            <span className="font-medium">{convStarted > 0 ? formatPercent((firstReply / convStarted) * 100) : '—'}</span>
          </div>
          <div>
            <span className="text-text-tertiary">Link Click→Conversation: </span>
            <span className="font-medium">{linkClicks > 0 ? formatPercent((convStarted / linkClicks) * 100) : '—'}</span>
          </div>
          <div>
            <span className="text-text-tertiary">Cost/Conversation Started: </span>
            <span className="font-medium">{getCost('onsite_conversion.messaging_conversation_started_7d') ? formatCurrency(getCost('onsite_conversion.messaging_conversation_started_7d')) : '—'}</span>
          </div>
          <div>
            <span className="text-text-tertiary">Cost/First Reply: </span>
            <span className="font-medium">{getCost('onsite_conversion.messaging_first_reply') ? formatCurrency(getCost('onsite_conversion.messaging_first_reply')) : '—'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function EngagementTab({ actions, costPerAction }) {
  const engFilter = (a) => ENGAGEMENT_TYPES.includes(a.action_type)
  const engActions = actions.filter(engFilter)
  const otherEng = actions.filter((a) => !engFilter(a) && !a.action_type?.includes('messaging') && !a.action_type?.includes('onsite_conversion'))

  return (
    <div className="space-y-4">
      <ActionMetricsTable actions={engActions} costPerAction={costPerAction} title="Engagement Actions" filterFn={() => true} />
      {otherEng.length > 0 && (
        <ActionMetricsTable actions={otherEng} costPerAction={costPerAction} title="Other Actions" filterFn={() => true} />
      )}
    </div>
  )
}

function CreativeTab({ cr, ad }) {
  const oss = cr.object_story_spec || {}
  const linkData = oss.link_data || {}
  const pageWelcome = linkData.page_welcome_message

  return (
    <div className="space-y-4">
      {/* Image preview */}
      {(cr.thumbnail_url || cr.image_url) && (
        <img src={cr.thumbnail_url || cr.image_url} alt="" className="max-h-48 rounded-lg border border-border-default object-contain" />
      )}

      <DetailTable rows={[
        ['Creative ID', cr.id],
        ['Creative Name', cr.name],
        ['Title / Headline', cr.title || linkData.name],
        ['CTA Type', cr.call_to_action_type || linkData.call_to_action?.type],
        ['Destination URL', linkData.link],
        ['Instagram Permalink', cr.instagram_permalink_url],
        ['Preview Link', ad.preview_shareable_link],
        ['Effective Story ID', cr.effective_object_story_id],
        ['Image Hash', cr.image_hash],
      ]} />

      {/* Body text with preserved line breaks */}
      {(cr.body || linkData.message) && (
        <div>
          <p className="text-[10px] font-semibold text-text-secondary mb-1">Primary Text / Body</p>
          <div className="rounded-lg border border-border-default bg-white p-3 text-xs text-text-primary whitespace-pre-wrap leading-relaxed">
            {cr.body || linkData.message}
          </div>
        </div>
      )}

      {/* Page Welcome Message */}
      {pageWelcome && (
        <div>
          <p className="text-[10px] font-semibold text-text-secondary mb-1">Page Welcome Message</p>
          <div className="rounded-lg border border-border-default bg-blue-50/30 p-3 space-y-2 text-xs">
            {(() => {
              try {
                const parsed = typeof pageWelcome === 'string' ? JSON.parse(pageWelcome) : pageWelcome
                return (
                  <>
                    {parsed.landing_screen_welcome_message?.message && (
                      <div><span className="text-text-tertiary">Welcome:</span> {parsed.landing_screen_welcome_message.message}</div>
                    )}
                    {parsed.follow_up_message?.text_with_entities?.text && (
                      <div><span className="text-text-tertiary">Follow-up:</span> {parsed.follow_up_message.text_with_entities.text}</div>
                    )}
                    {parsed.ice_breakers?.length > 0 && (
                      <div>
                        <span className="text-text-tertiary">Ice Breakers:</span>
                        <ul className="ml-3 mt-1 space-y-1">
                          {parsed.ice_breakers.map((ib, i) => (
                            <li key={i} className="text-[10px]">
                              <span className="font-medium">Q:</span> {ib.question}
                              {ib.answer && <span className="text-text-tertiary ml-2">A: {ib.answer}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )
              } catch {
                return <pre className="text-[9px] text-text-tertiary overflow-auto">{JSON.stringify(pageWelcome, null, 2)}</pre>
              }
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

function TargetingTab({ adset }) {
  const t = adset.targeting || {}
  const geo = t.geo_locations || {}

  return (
    <DetailTable rows={[
      ['Min Age', t.age_min],
      ['Max Age', t.age_max],
      ['Age Range', t.age_min && t.age_max ? `${t.age_min}–${t.age_max}` : null],
      ['Countries', geo.countries?.join(', ')],
      ['Location Types', geo.location_types?.join(', ')],
      ['Advantage Audience', t.targeting_optimization ? 'Enabled' : 'Standard'],
      ['Age Expansion', t.targeting_automation?.advantage_audience === 1 ? 'Enabled' : 'Off'],
      ['Brand Safety', t.brand_safety_content_filter_levels?.join(', ')],
    ]} />
  )
}

function CampaignTab({ camp, adset }) {
  return (
    <DetailTable rows={[
      ['Campaign ID', camp.id],
      ['Campaign Name', camp.name],
      ['Campaign Status', camp.status],
      ['Effective Status', camp.effective_status],
      ['Objective', camp.objective],
      ['Buying Type', camp.buying_type],
      ['Special Ad Categories', camp.special_ad_categories?.join(', ') || 'None'],
      ['—', ''],
      ['Ad Set ID', adset.id],
      ['Ad Set Name', adset.name],
      ['Optimization Goal', adset.optimization_goal],
      ['Billing Event', adset.billing_event],
      ['Daily Budget', adset.daily_budget ? formatCurrency(adset.daily_budget / 100) : '—'],
      ['Lifetime Budget', adset.lifetime_budget ? formatCurrency(adset.lifetime_budget / 100) : '—'],
    ]} />
  )
}
