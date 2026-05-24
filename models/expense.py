from datetime import datetime
from models import db

class Expense(db.Model):
    """Expense record database model."""
    __tablename__ = 'expenses'

    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False) # Converted amount in user's preferred currency
    currency = db.Column(db.String(10), nullable=False, default='USD') # Original currency selected for expense
    original_amount = db.Column(db.Float, nullable=False, default=0.0) # Original amount in selected currency
    category = db.Column(db.String(50), nullable=False, index=True)
    description = db.Column(db.String(255), nullable=True)
    date = db.Column(db.Date, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def currency_symbol(self):
        symbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'INR': '₹',
            'JPY': '¥',
            'AUD': 'A$',
            'CAD': 'C$',
            'CNY': '¥'
        }
        return symbols.get(self.currency, '$')

    def __repr__(self):
        return f'<Expense {self.category}: {self.amount}>'
