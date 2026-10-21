"""Add due_date and wholesale columns

Revision ID: b7c12d45e89a
Revises: 04ad0536accb
Create Date: 2026-10-21 16:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c12d45e89a'
down_revision: Union[str, None] = '04ad0536accb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Invoices
    op.add_column('invoices', sa.Column('due_date', sa.DateTime(timezone=True), nullable=True))

    # 2. Businesses
    op.add_column('businesses', sa.Column('invoice_counter', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('businesses', sa.Column('bank_name', sa.String(), nullable=True))
    op.add_column('businesses', sa.Column('bank_account_number', sa.String(), nullable=True))
    op.add_column('businesses', sa.Column('bank_ifsc', sa.String(), nullable=True))

    # 3. Stock Items
    op.add_column('stock_items', sa.Column('hsn_code', sa.String(), nullable=True))
    op.add_column('stock_items', sa.Column('gst_rate', sa.Float(), nullable=True, server_default='0'))

    # 4. Transaction Items
    op.add_column('transaction_items', sa.Column('gst_rate', sa.Float(), nullable=True, server_default='0'))
    op.add_column('transaction_items', sa.Column('tax_amount', sa.Float(), nullable=True, server_default='0'))


def downgrade() -> None:
    op.drop_column('transaction_items', 'tax_amount')
    op.drop_column('transaction_items', 'gst_rate')
    op.drop_column('stock_items', 'gst_rate')
    op.drop_column('stock_items', 'hsn_code')
    op.drop_column('businesses', 'bank_ifsc')
    op.drop_column('businesses', 'bank_account_number')
    op.drop_column('businesses', 'bank_name')
    op.drop_column('businesses', 'invoice_counter')
    op.drop_column('invoices', 'due_date')

