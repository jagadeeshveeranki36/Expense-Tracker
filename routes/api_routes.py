from flask import Blueprint, jsonify, request, abort
from flask_login import login_required, current_user
from datetime import datetime, timedelta
from models import db
from models.expense import Expense
from models.budget import Budget
from sqlalchemy import func
import calendar

api_bp = Blueprint('api', __name__)

@api_bp.route('/api/expenses', methods=['GET'])
@login_required
def get_expenses():
    """List all user expenses in JSON format."""
    expenses = Expense.query.filter_by(user_id=current_user.id).order_by(Expense.date.desc()).all()
    return jsonify([{
        'id': exp.id,
        'amount': exp.amount,
        'category': exp.category,
        'description': exp.description,
        'date': exp.date.strftime('%Y-%m-%d'),
        'created_at': exp.created_at.strftime('%Y-%m-%d %H:%M:%S')
    } for exp in expenses])


@api_bp.route('/api/expenses', methods=['POST'])
@login_required
def create_expense_api():
    """REST API: Add a new expense."""
    data = request.get_json() or {}
    if 'amount' not in data or 'category' not in data or 'date' not in data:
        return jsonify({'error': 'Missing required fields (amount, category, date)'}), 400
        
    try:
        exp_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        expense = Expense(
            amount=float(data['amount']),
            category=data['category'],
            description=data.get('description', ''),
            date=exp_date,
            user_id=current_user.id
        )
        db.session.add(expense)
        db.session.commit()
        return jsonify({
            'success': True,
            'expense': {
                'id': expense.id,
                'amount': expense.amount,
                'category': expense.category,
                'description': expense.description,
                'date': expense.date.strftime('%Y-%m-%d')
            }
        }), 210
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@api_bp.route('/api/expenses/<int:id>', methods=['PUT'])
@login_required
def update_expense_api(id):
    """REST API: Update an existing expense."""
    expense = Expense.query.filter_by(id=id, user_id=current_user.id).first_or_404()
    data = request.get_json() or {}
    
    try:
        if 'amount' in data:
            expense.amount = float(data['amount'])
        if 'category' in data:
            expense.category = data['category']
        if 'description' in data:
            expense.description = data['description']
        if 'date' in data:
            expense.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
            
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@api_bp.route('/api/expenses/<int:id>', methods=['DELETE'])
@login_required
def delete_expense_api(id):
    """REST API: Delete an expense."""
    expense = Expense.query.filter_by(id=id, user_id=current_user.id).first_or_404()
    db.session.delete(expense)
    db.session.commit()
    return jsonify({'success': True})


@api_bp.route('/api/reports/summary', methods=['GET'])
@login_required
def get_reports_summary():
    """Generates complete aggregated analytics data for theme-aware Charts."""
    now = datetime.now()
    current_month = now.month
    current_year = now.year
    
    # Predefined category list
    categories = ['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Healthcare', 'Education', 'Others']
    
    # 1. Pie Chart - Category Breakdown (Current Month)
    pie_query = db.session.query(
        Expense.category,
        func.coalesce(func.sum(Expense.amount), 0.0)
    ).filter(
        Expense.user_id == current_user.id,
        func.strftime('%m', Expense.date) == f'{current_month:02d}',
        func.strftime('%Y', Expense.date) == str(current_year)
    ).group_by(Expense.category).all()
    
    pie_data = {cat: 0.0 for cat in categories}
    for row in pie_query:
        if row[0] in pie_data:
            pie_data[row[0]] = float(row[1]) if row[1] is not None else 0.0
            
    # 2. Bar Graph - Last 6 Months comparison
    months_labels = []
    months_spends = []
    
    for i in range(5, -1, -1):
        target_date = now - timedelta(days=i*30) # rough last 6 months mapping
        m = target_date.month
        y = target_date.year
        
        month_spend = db.session.query(func.coalesce(func.sum(Expense.amount), 0.0)).filter(
            Expense.user_id == current_user.id,
            func.strftime('%m', Expense.date) == f'{m:02d}',
            func.strftime('%Y', Expense.date) == str(y)
        ).scalar() or 0.0
        
        months_labels.append(f"{calendar.month_abbr[m]} {y}")
        months_spends.append(float(month_spend))
        
    # 3. Line Chart - Spending Trend over time (Daily trends of current month)
    days_in_month = calendar.monthrange(current_year, current_month)[1]
    trend_labels = [str(d) for d in range(1, days_in_month + 1)]
    trend_spends = [0.0] * days_in_month
    
    trend_query = db.session.query(
        func.strftime('%d', Expense.date),
        func.coalesce(func.sum(Expense.amount), 0.0)
    ).filter(
        Expense.user_id == current_user.id,
        func.strftime('%m', Expense.date) == f'{current_month:02d}',
        func.strftime('%Y', Expense.date) == str(current_year)
    ).group_by(func.strftime('%d', Expense.date)).all()
    
    for row in trend_query:
        try:
            day_idx = int(row[0]) - 1
            if 0 <= day_idx < days_in_month:
                trend_spends[day_idx] = float(row[1])
        except (ValueError, TypeError):
            pass
            
    # Calculate Stats
    monthly_total = sum(pie_data.values())
    daily_avg = monthly_total / now.day if now.day > 0 else 0.0
    
    highest_cat = "None"
    highest_amt = 0.0
    for c, amt in pie_data.items():
        if amt > highest_amt:
            highest_amt = amt
            highest_cat = c
            
    return jsonify({
        'pie': {
            'labels': list(pie_data.keys()),
            'data': list(pie_data.values())
        },
        'bar': {
            'labels': months_labels,
            'data': months_spends
        },
        'line': {
            'labels': trend_labels,
            'data': trend_spends
        },
        'stats': {
            'monthly_total': round(monthly_total, 2),
            'daily_average': round(daily_avg, 2),
            'highest_category': highest_cat,
            'highest_amount': round(highest_amt, 2)
        }
    })


@api_bp.route('/api/budgets', methods=['POST'])
@login_required
def set_budget():
    """Allows setting category specific monthly budgets."""
    data = request.get_json() or {}
    category = data.get('category')
    limit = data.get('limit')
    
    if not category or limit is None:
        return jsonify({'error': 'Missing category or limit'}), 400
        
    now = datetime.now()
    month = now.month
    year = now.year
    
    try:
        limit_val = float(limit)
        budget = Budget.query.filter_by(
            user_id=current_user.id,
            category=category,
            month=month,
            year=year
        ).first()
        
        if budget:
            budget.monthly_limit = limit_val
        else:
            budget = Budget(
                user_id=current_user.id,
                category=category,
                monthly_limit=limit_val,
                month=month,
                year=year
            )
            db.session.add(budget)
            
        db.session.commit()
        return jsonify({'success': True, 'limit': limit_val, 'category': category})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
