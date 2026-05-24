from flask_wtf import FlaskForm
from wtforms import DecimalField, SelectField, StringField, DateField, SubmitField
from wtforms.validators import DataRequired, NumberRange, Length, Optional
from datetime import date

class ExpenseForm(FlaskForm):
    """Form to add or edit an expense record."""
    amount = DecimalField('Amount', validators=[
        DataRequired(message="Amount is required"),
        NumberRange(min=0.01, message="Amount must be positive")
    ], places=2)
    
    currency = SelectField('Currency', choices=[
        ('USD', 'USD ($)'),
        ('EUR', 'EUR (€)'),
        ('GBP', 'GBP (£)'),
        ('INR', 'INR (₹)'),
        ('JPY', 'JPY (¥)'),
        ('AUD', 'AUD (A$)'),
        ('CAD', 'CAD (C$)'),
        ('CNY', 'CNY (¥)')
    ], default='INR', validators=[DataRequired(message="Currency is required")])
    
    category = SelectField('Category', choices=[
        ('Food', '🍔 Food'),
        ('Travel', '✈️ Travel'),
        ('Shopping', '🛍️ Shopping'),
        ('Bills', '💡 Bills'),
        ('Entertainment', '🎬 Entertainment'),
        ('Healthcare', '🏥 Healthcare'),
        ('Education', '📚 Education'),
        ('Others', '📦 Others')
    ], validators=[DataRequired(message="Category is required")])
    
    description = StringField('Description', validators=[
        Optional(),
        Length(max=255, message="Description cannot exceed 255 characters")
    ])
    
    date = DateField('Date', default=date.today, validators=[
        DataRequired(message="Date is required")
    ])
    
    submit = SubmitField('Save Expense')
