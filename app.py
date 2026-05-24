import os
from flask import Flask, render_template
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
from flask_cors import CORS
from config import config_by_name
from models import db
from models.user import User

def create_app(config_name='dev'):
    """Application factory building flask stack components."""
    app = Flask(__name__)
    
    # Load configuration
    config_class = config_by_name.get(config_name, config_by_name['default'])
    app.config.from_object(config_class)
    
    # Bind SQLite extensions
    db.init_app(app)
    Bcrypt(app)
    Migrate(app, db)
    CORS(app)
    
    # Session auth
    login_manager = LoginManager()
    login_manager.login_view = 'auth.login'
    login_manager.login_message_category = 'info'
    login_manager.init_app(app)
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
        
    # Global CSRF Protect (session safe)
    CSRFProtect(app)
    
    # Register Blueprints
    from routes.auth_routes import auth_bp
    from routes.dashboard_routes import dashboard_bp
    from routes.expense_routes import expense_bp
    from routes.report_routes import report_bp
    from routes.api_routes import api_bp
    
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(dashboard_bp, url_prefix='/')
    app.register_blueprint(expense_bp, url_prefix='/expenses')
    app.register_blueprint(report_bp, url_prefix='/reports')
    app.register_blueprint(api_bp)
    
    @app.context_processor
    def inject_expense_form():
        """Injects a global quick expense form instance into all layouts."""
        from forms.expense_form import ExpenseForm
        return dict(quick_expense_form=ExpenseForm())
    
    @app.context_processor
    def inject_active_accounts():
        """Injects active logged-in bank accounts details globally for the switcher."""
        from flask import session
        from flask_login import current_user
        from models.user import User
        
        logged_in_ids = session.get('logged_in_user_ids', [])
        if not isinstance(logged_in_ids, list):
            logged_in_ids = []
            
        if current_user.is_authenticated and current_user.id not in logged_in_ids:
            logged_in_ids.append(current_user.id)
            session['logged_in_user_ids'] = logged_in_ids
            
        active_accounts = []
        for uid in logged_in_ids:
            u = User.query.get(uid)
            if u:
                active_accounts.append(u)
        return dict(active_accounts=active_accounts)
    
    @app.after_request
    def set_security_headers(response):
        """Enforces robust HTTP security headers on all responses."""
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        # Secure Content-Security-Policy supporting CDNs and data URIs
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
            "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com; "
            "img-src 'self' data:; "
            "connect-src 'self';"
        )
        return response

    # Global HTTP error register handlers
    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('errors/404.html'), 404
        
    @app.errorhandler(500)
    def internal_server_error(e):
        return render_template('errors/500.html'), 500
        
    # Create SQLite database structures dynamically if they don't exist
    with app.app_context():
        db.create_all()
        
        # Self-healing dynamic schema migrations for SQLite
        try:
            with db.engine.connect() as conn:
                # Query expenses table info
                result = conn.execute(db.text("PRAGMA table_info(expenses)"))
                columns = [row[1] for row in result.fetchall()]
                
                # If currency column is missing, add it
                if 'currency' not in columns:
                    conn.execute(db.text("ALTER TABLE expenses ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD'"))
                    conn.commit()
                    
                # If original_amount column is missing, add it and backfill it
                if 'original_amount' not in columns:
                    conn.execute(db.text("ALTER TABLE expenses ADD COLUMN original_amount FLOAT NOT NULL DEFAULT 0.0"))
                    conn.commit()
                    
                    # Backfill original_amount with the converted amount
                    conn.execute(db.text("UPDATE expenses SET original_amount = amount WHERE original_amount = 0.0"))
                    conn.commit()
                
                # Query users table info for self-healing bank_name
                result_users = conn.execute(db.text("PRAGMA table_info(users)"))
                columns_users = [row[1] for row in result_users.fetchall()]
                
                if 'bank_name' not in columns_users:
                    conn.execute(db.text("ALTER TABLE users ADD COLUMN bank_name VARCHAR(100) NULL DEFAULT 'Primary Bank'"))
                    conn.commit()
        except Exception as e:
            app.logger.warning(f"Self-healing database migration skipped/failed: {str(e)}")
        
    return app

# Dev launch point
app = create_app(os.environ.get('FLASK_ENV', 'dev'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
