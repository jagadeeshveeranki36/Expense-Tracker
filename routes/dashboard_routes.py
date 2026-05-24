from flask import Blueprint, render_template, redirect, url_for
from flask_login import login_required, current_user
from datetime import datetime
from models import db
from models.expense import Expense
from models.budget import Budget
from forms.expense_form import ExpenseForm
from sqlalchemy import func

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/')
def landing():
    """Renders the high-aesthetic floating landing hero page."""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard.index'))
    return render_template('index.html')


def get_conversions(amount, base_currency):
    """Safely converts an amount from a given base currency into all 8 major currencies using realistic rates."""
    rates = {
        'USD': 1.0,
        'EUR': 0.92,
        'GBP': 0.79,
        'INR': 83.3,
        'JPY': 156.0,
        'AUD': 1.50,
        'CAD': 1.36,
        'CNY': 7.24
    }
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
    base_rate = rates.get(base_currency, 1.0)
    amount_in_usd = amount / base_rate if base_rate > 0 else amount
    
    conversions = []
    for cur, rate in rates.items():
        converted = amount_in_usd * rate
        conversions.append({
            'code': cur,
            'symbol': symbols.get(cur, '$'),
            'amount': converted
        })
    return conversions


@dashboard_bp.route('/dashboard')
@login_required
def index():
    """Renders the main animated user dashboard."""
    now = datetime.now()
    current_month = now.month
    current_year = now.year
    
    # 1. Total All-time Expenses
    total_expenses = db.session.query(
        func.coalesce(func.sum(Expense.amount), 0.0)
    ).filter_by(user_id=current_user.id).scalar()
    
    # 2. Current Month Spending
    monthly_total = db.session.query(
        func.coalesce(func.sum(Expense.amount), 0.0)
    ).filter(
        Expense.user_id == current_user.id,
        func.strftime('%m', Expense.date) == f'{current_month:02d}',
        func.strftime('%Y', Expense.date) == str(current_year)
    ).scalar()
    
    # 3. Daily Average for this Month
    days_in_month = now.day  # Average up to today's date in current month
    daily_average = monthly_total / max(days_in_month, 1)
    
    # 4. Recent Transactions (latest 5)
    recent_transactions = Expense.query.filter_by(user_id=current_user.id).order_by(Expense.date.desc(), Expense.id.desc()).limit(5).all()
    
    # 5. Budgets progress tracking for Current Month
    budgets = Budget.query.filter_by(user_id=current_user.id, month=current_month, year=current_year).all()
    budget_map = {b.category: b.monthly_limit for b in budgets}
    
    # Predefined categories for UI structure
    categories_ui = [
        {'name': 'Food', 'icon': '🍔', 'color': '#6366f1'},
        {'name': 'Travel', 'icon': '✈️', 'color': '#06b6d4'},
        {'name': 'Shopping', 'icon': '🛍️', 'color': '#ec4899'},
        {'name': 'Bills', 'icon': '💡', 'color': '#f59e0b'},
        {'name': 'Entertainment', 'icon': '🎬', 'color': '#8b5cf6'},
        {'name': 'Healthcare', 'icon': '🏥', 'color': '#ef4444'},
        {'name': 'Education', 'icon': '📚', 'color': '#10b981'},
        {'name': 'Others', 'icon': '📦', 'color': '#64748b'}
    ]
    
    # Group monthly expenses by category - safely handle None/NULLs using coalesce
    category_expenses_query = db.session.query(
        Expense.category,
        func.coalesce(func.sum(Expense.amount), 0.0)
    ).filter(
        Expense.user_id == current_user.id,
        func.strftime('%m', Expense.date) == f'{current_month:02d}',
        func.strftime('%Y', Expense.date) == str(current_year)
    ).group_by(Expense.category).all()
    
    cat_spend_map = {row[0]: float(row[1]) for row in category_expenses_query if row[0] is not None}
    
    overspent_categories = []
    category_summary = []
    
    for cat in categories_ui:
        cat_name = cat['name']
        spend = cat_spend_map.get(cat_name, 0.0)
        limit = budget_map.get(cat_name, 0.0)
        
        percent = 0.0
        if limit > 0:
            percent = min((spend / limit) * 100, 100.0)
            if spend > limit:
                overspent_categories.append({
                    'category': cat_name,
                    'icon': cat['icon'],
                    'spend': spend,
                    'limit': limit,
                    'excess': spend - limit
                })
                
        category_summary.append({
            'name': cat_name,
            'icon': cat['icon'],
            'color': cat['color'],
            'spend': spend,
            'limit': limit,
            'percent': round(percent, 1)
        })
        
    # Get highest spending category for this month
    highest_cat = "None"
    highest_amt = 0.0
    for cat_name, amt in cat_spend_map.items():
        if amt > highest_amt:
            highest_amt = amt
            highest_cat = cat_name
            
    # Forms
    quick_add_form = ExpenseForm()
    
    conversions = get_conversions(monthly_total, current_user.currency)
    
    return render_template(
        'dashboard.html',
        total_expenses=total_expenses,
        monthly_total=monthly_total,
        daily_average=round(daily_average, 2),
        recent_transactions=recent_transactions,
        category_summary=category_summary,
        highest_cat=highest_cat,
        highest_amt=highest_amt,
        overspent_categories=overspent_categories,
        conversions=conversions,
        form=quick_add_form
    )
