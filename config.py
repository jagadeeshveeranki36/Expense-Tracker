import os
from dotenv import load_dotenv

# Load variables from .env
load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    """Base configurations."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev_secret_key_change_me_in_production_12345')
    
    # Database
    DATABASE_DIR = os.path.join(BASE_DIR, 'database')
    # Ensure database directory exists
    os.makedirs(DATABASE_DIR, exist_ok=True)
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f'sqlite:///{os.path.join(DATABASE_DIR, "expense.db")}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Session security
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_DURATION = 86400 * 30  # 30 days
    
    # WTForms CSRF
    WTF_CSRF_ENABLED = True
    WTF_CSRF_SECRET_KEY = os.environ.get('WTF_CSRF_SECRET_KEY', 'csrf_secret_key_change_me_54321')


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    ENV = 'development'


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    ENV = 'production'
    # In production, require secure cookies if HTTPS is enabled
    SESSION_COOKIE_SECURE = False  # Set to True if using HTTPS
    REMEMBER_COOKIE_SECURE = False  # Set to True if using HTTPS


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False


config_by_name = {
    'dev': DevelopmentConfig,
    'prod': ProductionConfig,
    'test': TestingConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
