from datetime import datetime
from flask_login import UserMixin
from models import db
from flask_bcrypt import generate_password_hash, check_password_hash

class User(db.Model, UserMixin):
    """User accounts database model."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    profile_pic = db.Column(db.String(256), nullable=True, default='avatar-1.svg')
    currency = db.Column(db.String(10), nullable=False, default='USD')
    bank_name = db.Column(db.String(100), nullable=True, default='Primary Bank')

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

    # Relationships
    expenses = db.relationship('Expense', backref='user', lazy=True, cascade="all, delete-orphan")
    budgets = db.relationship('Budget', backref='user', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        """Hashes the user's password using Bcrypt."""
        self.password_hash = generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        """Checks the hashed password against user input."""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'
