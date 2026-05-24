from models import db

class Budget(db.Model):
    """Monthly budget limits per category database model."""
    __tablename__ = 'budgets'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    monthly_limit = db.Column(db.Float, nullable=False)
    month = db.Column(db.Integer, nullable=False)  # 1 - 12
    year = db.Column(db.Integer, nullable=False)   # e.g., 2026

    # Unique constraint so users only have 1 budget per category per month
    __table_args__ = (
        db.UniqueConstraint('user_id', 'category', 'month', 'year', name='_user_category_month_year_uc'),
    )

    def __repr__(self):
        return f'<Budget {self.category}: {self.monthly_limit} for {self.month}/{self.year}>'
