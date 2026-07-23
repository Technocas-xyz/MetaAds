"""Add Facebook owned-ads persistence tables

Revision ID: i9d0e1f2g3h4
Revises: g7b8c9d0e1f2
Create Date: 2026-07-21 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = "i9d0e1f2g3h4"
down_revision: Union[str, None] = "g7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── facebook_owned_ads ────────────────────────────────────────────────
    op.create_table(
        "facebook_owned_ads",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("meta_ad_id", sa.String(50), nullable=False),
        sa.Column("account_id", sa.String(50), nullable=False),
        sa.Column("campaign_id", sa.String(50), nullable=True),
        sa.Column("campaign_name", sa.Text(), nullable=True),
        sa.Column("campaign_objective", sa.String(100), nullable=True),
        sa.Column("campaign_status", sa.String(30), nullable=True),
        sa.Column("adset_id", sa.String(50), nullable=True),
        sa.Column("adset_name", sa.Text(), nullable=True),
        sa.Column("adset_status", sa.String(30), nullable=True),
        sa.Column("ad_name", sa.Text(), nullable=True),
        sa.Column("configured_status", sa.String(30), nullable=True),
        sa.Column("effective_status", sa.String(30), nullable=True),
        sa.Column("creative_id", sa.String(50), nullable=True),
        sa.Column("creative_name", sa.Text(), nullable=True),
        sa.Column("headline", sa.Text(), nullable=True),
        sa.Column("primary_text", sa.Text(), nullable=True),
        sa.Column("cta_type", sa.String(100), nullable=True),
        sa.Column("destination", sa.Text(), nullable=True),
        sa.Column("thumbnail_url", sa.Text(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("instagram_permalink_url", sa.Text(), nullable=True),
        sa.Column("preview_shareable_link", sa.Text(), nullable=True),
        sa.Column("effective_object_story_id", sa.String(100), nullable=True),
        sa.Column("meta_created_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("meta_updated_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("first_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("raw_ad_payload", JSONB(), nullable=True),
        sa.Column("raw_campaign_payload", JSONB(), nullable=True),
        sa.Column("raw_adset_payload", JSONB(), nullable=True),
        sa.Column("raw_creative_payload", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_facebook_owned_ads_meta_ad_id", "facebook_owned_ads", ["meta_ad_id"], unique=True)
    op.create_index("ix_facebook_owned_ads_account_id", "facebook_owned_ads", ["account_id"])
    op.create_index("ix_facebook_owned_ads_effective_status", "facebook_owned_ads", ["effective_status"])
    op.create_index("ix_facebook_owned_ads_is_active", "facebook_owned_ads", ["is_active"])

    # ── facebook_ad_insights_daily ────────────────────────────────────────
    op.create_table(
        "facebook_ad_insights_daily",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("meta_ad_id", sa.String(50), nullable=False),
        sa.Column("date_start", sa.Date(), nullable=False),
        sa.Column("date_stop", sa.Date(), nullable=False),
        sa.Column("impressions", sa.BigInteger(), nullable=True),
        sa.Column("reach", sa.BigInteger(), nullable=True),
        sa.Column("frequency", sa.Numeric(10, 4), nullable=True),
        sa.Column("spend", sa.Numeric(14, 4), nullable=True),
        sa.Column("clicks", sa.BigInteger(), nullable=True),
        sa.Column("unique_clicks", sa.BigInteger(), nullable=True),
        sa.Column("inline_link_clicks", sa.BigInteger(), nullable=True),
        sa.Column("ctr", sa.Numeric(10, 6), nullable=True),
        sa.Column("unique_ctr", sa.Numeric(10, 6), nullable=True),
        sa.Column("inline_link_click_ctr", sa.Numeric(10, 6), nullable=True),
        sa.Column("cpc", sa.Numeric(14, 4), nullable=True),
        sa.Column("cpm", sa.Numeric(14, 4), nullable=True),
        sa.Column("raw_insights_payload", JSONB(), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_fb_insights_daily_meta_ad_id", "facebook_ad_insights_daily", ["meta_ad_id"])
    op.create_index("ix_fb_insights_daily_date_start", "facebook_ad_insights_daily", ["date_start"])
    op.create_unique_constraint(
        "uq_fb_insights_daily_ad_date",
        "facebook_ad_insights_daily",
        ["meta_ad_id", "date_start", "date_stop"],
    )

    # ── facebook_ad_actions_daily ─────────────────────────────────────────
    op.create_table(
        "facebook_ad_actions_daily",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("meta_ad_id", sa.String(50), nullable=False),
        sa.Column("date_start", sa.Date(), nullable=False),
        sa.Column("action_source", sa.String(30), nullable=False, server_default="actions"),
        sa.Column("action_type", sa.String(200), nullable=False),
        sa.Column("value", sa.Numeric(18, 4), nullable=True),
        sa.Column("raw_action_payload", JSONB(), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_fb_actions_daily_meta_ad_id", "facebook_ad_actions_daily", ["meta_ad_id"])
    op.create_index("ix_fb_actions_daily_date_start", "facebook_ad_actions_daily", ["date_start"])
    op.create_unique_constraint(
        "uq_fb_actions_daily",
        "facebook_ad_actions_daily",
        ["meta_ad_id", "date_start", "action_source", "action_type"],
    )

    # ── facebook_ad_sync_runs ─────────────────────────────────────────────
    op.create_table(
        "facebook_ad_sync_runs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("account_id", sa.String(50), nullable=False),
        sa.Column("sync_type", sa.String(40), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="running"),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ads_received", sa.Integer(), nullable=True),
        sa.Column("ads_inserted", sa.Integer(), nullable=True),
        sa.Column("ads_updated", sa.Integer(), nullable=True),
        sa.Column("insight_rows_inserted", sa.Integer(), nullable=True),
        sa.Column("insight_rows_updated", sa.Integer(), nullable=True),
        sa.Column("action_rows_inserted", sa.Integer(), nullable=True),
        sa.Column("action_rows_updated", sa.Integer(), nullable=True),
        sa.Column("pages_fetched", sa.Integer(), nullable=True),
        sa.Column("sanitized_error", JSONB(), nullable=True),
        sa.Column("diagnostics", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_fb_sync_runs_account_id", "facebook_ad_sync_runs", ["account_id"])
    op.create_index("ix_fb_sync_runs_status", "facebook_ad_sync_runs", ["status"])


def downgrade() -> None:
    op.drop_table("facebook_ad_sync_runs")
    op.drop_table("facebook_ad_actions_daily")
    op.drop_table("facebook_ad_insights_daily")
    op.drop_table("facebook_owned_ads")
