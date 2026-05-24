from flask import Blueprint, render_template, redirect, url_for, flash, request, session
from flask_login import login_user, logout_user, login_required, current_user
from models import db
from models.user import User
from forms.login_form import LoginForm
from forms.register_form import RegisterForm
import random

auth_bp = Blueprint('auth', __name__)

def generate_security_challenge():
    """Generates a random math problem and saves the answer in the session."""
    num1 = random.randint(1, 10)
    num2 = random.randint(1, 10)
    operator = random.choice(['+', '-', '*'])
    
    if operator == '+':
        ans = num1 + num2
    elif operator == '-':
        ans = num1 - num2
    else:
        ans = num1 * num2
        
    session['security_challenge_q'] = f"What is {num1} {operator} {num2}?"
    session['security_challenge_a'] = str(ans)

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """Register a new user, supporting additional bank account creation."""
    if current_user.is_authenticated and not request.args.get('add_account'):
        return redirect(url_for('dashboard.index'))
    
    form = RegisterForm()
    
    if request.method == 'POST':
        user_answer = request.form.get('security_answer', '').strip()
        correct_answer = session.get('security_challenge_a')
        
        # Always generate a new challenge for the next render/attempt
        generate_security_challenge()
        
        if not correct_answer or user_answer != correct_answer:
            flash('Security check failed! Please solve the anti-bot math challenge correctly.', 'danger')
            return render_template('register.html', form=form)
            
        if form.validate_on_submit():
            user = User(
                username=form.username.data.strip(),
                email=form.email.data.strip().lower()
            )
            user.set_password(form.password.data)
            
            # Stagger dynamic profile pic selection (1 out of 6 modern designs)
            pic_id = (User.query.count() % 6) + 1
            user.profile_pic = f'avatar-{pic_id}.svg'
            
            db.session.add(user)
            db.session.commit()
            
            # If creating an additional bank account, log them in immediately and add to switcher
            if request.args.get('add_account'):
                logged_in_ids = session.get('logged_in_user_ids', [])
                if not isinstance(logged_in_ids, list):
                    logged_in_ids = []
                if user.id not in logged_in_ids:
                    if len(logged_in_ids) >= 5:
                        flash('Maximum of 5 logged-in bank accounts reached. Please sign out of an account first.', 'danger')
                        return redirect(url_for('dashboard.index'))
                    logged_in_ids.append(user.id)
                session['logged_in_user_ids'] = logged_in_ids
                
                login_user(user)
                flash(f'Account created and added successfully! Switched to {user.username} ({user.bank_name}).', 'success')
                return redirect(url_for('dashboard.index'))
            
            flash('Registration successful! You can now log in.', 'success')
            return redirect(url_for('auth.login'))
    else:
        generate_security_challenge()
        
    return render_template('register.html', form=form)


import os
from flask import current_app
import time
import re
from datetime import datetime
from sqlalchemy import func
from flask import session
from models.expense import Expense
from models.budget import Budget

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Login an existing user with brute force security throttling and anti-bot check."""
    if current_user.is_authenticated and not request.args.get('add_account'):
        return redirect(url_for('dashboard.index'))
    
    # Brute-force throttling lockout check (5 attempts, 30s lock)
    lockout_time = session.get('lockout_time')
    if lockout_time:
        remaining = int(lockout_time - time.time())
        if remaining > 0:
            flash(f'Too many failed login attempts. Please try again in {remaining} seconds.', 'danger')
            return render_template('login.html', form=LoginForm())
        else:
            session.pop('lockout_time', None)
            session.pop('login_attempts', None)
            
    form = LoginForm()
    
    if request.method == 'POST':
        user_answer = request.form.get('security_answer', '').strip()
        correct_answer = session.get('security_challenge_a')
        
        # Always generate a new challenge for the next attempt or render
        generate_security_challenge()
        
        if not correct_answer or user_answer != correct_answer:
            flash('Security check failed! Please solve the anti-bot math challenge correctly.', 'danger')
            return render_template('login.html', form=form)
            
        if form.validate_on_submit():
            user = User.query.filter_by(email=form.email.data.strip().lower()).first()
            if user and user.check_password(form.password.data):
                # Success: clear temporary rate limit counters
                session.pop('login_attempts', None)
                session.pop('lockout_time', None)
                
                # Multi-account session updates
                logged_in_ids = session.get('logged_in_user_ids', [])
                if not isinstance(logged_in_ids, list):
                    logged_in_ids = []
                if user.id not in logged_in_ids:
                    if len(logged_in_ids) >= 5:
                        flash('Maximum of 5 logged-in bank accounts reached. Please sign out of an account before adding another.', 'danger')
                        return redirect(url_for('dashboard.index'))
                    logged_in_ids.append(user.id)
                session['logged_in_user_ids'] = logged_in_ids
                
                login_user(user, remember=form.remember.data)
                next_page = request.args.get('next')
                flash(f'Welcome back, {user.username}!', 'success')
                return redirect(next_page or url_for('dashboard.index'))
            else:
                attempts = session.get('login_attempts', 0) + 1
                session['login_attempts'] = attempts
                if attempts >= 5:
                    session['lockout_time'] = time.time() + 30
                    flash('Too many failed login attempts. You are locked out for 30 seconds.', 'danger')
                else:
                    flash(f'Invalid email or password. Attempt {attempts} of 5.', 'danger')
    else:
        generate_security_challenge()
            
    return render_template('login.html', form=form)


@auth_bp.route('/logout')
@login_required
def logout():
    """Logout the current user, switching to another logged-in account if available."""
    logged_in_ids = session.get('logged_in_user_ids', [])
    current_id = current_user.id
    
    if current_id in logged_in_ids:
        logged_in_ids.remove(current_id)
        session['logged_in_user_ids'] = logged_in_ids
        
    logout_user()
    
    if logged_in_ids:
        next_user = User.query.get(logged_in_ids[0])
        if next_user:
            login_user(next_user)
            flash(f'Signed out of previous account. Switched to {next_user.username} ({next_user.bank_name}).', 'info')
            return redirect(url_for('dashboard.index'))
            
    flash('You have been logged out successfully.', 'info')
    return redirect(url_for('auth.login'))


@auth_bp.route('/logout-all')
def logout_all():
    """Logout all logged-in accounts."""
    session.pop('logged_in_user_ids', None)
    logout_user()
    flash('Logged out of all accounts successfully.', 'info')
    return redirect(url_for('auth.login'))


@auth_bp.route('/switch-account/<int:user_id>')
@login_required
def switch_account(user_id):
    """Switch active user account among logged-in sessions."""
    logged_in_ids = session.get('logged_in_user_ids', [])
    if user_id not in logged_in_ids:
        flash('Account not found in active sessions.', 'danger')
        return redirect(url_for('dashboard.index'))
        
    user = User.query.get(user_id)
    if user:
        login_user(user)
        flash(f'Switched to account: {user.username} ({user.bank_name})', 'success')
    return redirect(url_for('dashboard.index'))


@auth_bp.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    """View and update user profile settings with aggregate metrics."""
    now = datetime.now()
    current_month = now.month
    current_year = now.year

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip().lower()
        profile_pic = request.form.get('profile_pic', current_user.profile_pic)
        password = request.form.get('password', '').strip()
        currency = request.form.get('currency', 'USD').strip()
        bank_name = request.form.get('bank_name', 'Primary Bank').strip()
        
        # Validations
        if not username or not email:
            flash('Username and email are required.', 'danger')
            return redirect(url_for('auth.profile'))
            
        # Check uniqueness if username changed
        if username != current_user.username:
            existing = User.query.filter_by(username=username).first()
            if existing:
                flash('Username is already taken.', 'danger')
                return redirect(url_for('auth.profile'))
                
        # Check uniqueness if email changed
        if email != current_user.email:
            existing = User.query.filter_by(email=email).first()
            if existing:
                flash('Email address is already in use.', 'danger')
                return redirect(url_for('auth.profile'))

        # Check for avatar_file upload from device
        avatar_file = request.files.get('avatar_file')
        if avatar_file and avatar_file.filename != '':
            # Validate extension
            ext = os.path.splitext(avatar_file.filename)[1].lower()
            if ext not in ['.png', '.jpg', '.jpeg', '.gif', '.svg']:
                flash('Unsupported file type! Please upload a PNG, JPG, JPEG, SVG, or GIF.', 'danger')
                return redirect(url_for('auth.profile'))
            
            # Save file
            filename = f"user_avatar_{current_user.id}_{int(time.time())}{ext}"
            static_images_path = os.path.join(current_app.root_path, 'static', 'images')
            os.makedirs(static_images_path, exist_ok=True)
            avatar_file.save(os.path.join(static_images_path, filename))
            
            # Update user profile pic
            current_user.profile_pic = filename
        elif profile_pic:
            current_user.profile_pic = profile_pic

        # Update details
        current_user.username = username
        current_user.email = email
        current_user.currency = currency
        current_user.bank_name = bank_name[:100]
        
        # Optional strict password complexity update
        if password:
            if len(password) < 6:
                flash('Password must be at least 6 characters long.', 'danger')
                return redirect(url_for('auth.profile'))
            if not re.search(r"[a-z]", password):
                flash('Password must contain at least one lowercase letter.', 'danger')
                return redirect(url_for('auth.profile'))
            if not re.search(r"[A-Z]", password):
                flash('Password must contain at least one uppercase letter.', 'danger')
                return redirect(url_for('auth.profile'))
            if not re.search(r"[0-9]", password):
                flash('Password must contain at least one number.', 'danger')
                return redirect(url_for('auth.profile'))
            if not re.search(r"[!@#$%^&*(),.?\":{}|<>_]", password):
                flash('Password must contain at least one special character.', 'danger')
                return redirect(url_for('auth.profile'))
            current_user.set_password(password)
            
        db.session.commit()
        flash('Your profile has been updated successfully!', 'success')
        return redirect(url_for('auth.profile'))
    
    # Query aggregate metrics for statistics display
    total_logs = Expense.query.filter_by(user_id=current_user.id).count()
    
    monthly_spent = db.session.query(
        func.coalesce(func.sum(Expense.amount), 0.0)
    ).filter(
        Expense.user_id == current_user.id,
        func.strftime('%m', Expense.date) == f'{current_month:02d}',
        func.strftime('%Y', Expense.date) == str(current_year)
    ).scalar()
    
    active_budgets = Budget.query.filter_by(
        user_id=current_user.id,
        month=current_month,
        year=current_year
    ).count()
        
    return render_template(
        'profile.html',
        total_logs=total_logs,
        monthly_spent=monthly_spent,
        active_budgets=active_budgets
    )


@auth_bp.route('/delete-account', methods=['POST'])
@login_required
def delete_account():
    """Permanently purge the user account, budgets, and expenses after password confirmation."""
    password = request.form.get('password', '').strip()
    if not password:
        flash('Please enter your password to confirm account deletion.', 'danger')
        return redirect(url_for('auth.profile'))
        
    if not current_user.check_password(password):
        flash('Incorrect password. Account deletion cancelled.', 'danger')
        return redirect(url_for('auth.profile'))
        
    user = current_user
    logout_user()
    db.session.delete(user)
    db.session.commit()
    
    flash('Your account and all associated data have been permanently deleted.', 'success')
    return redirect(url_for('dashboard.landing'))
