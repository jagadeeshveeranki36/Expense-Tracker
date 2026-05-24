from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired, Email, Length, EqualTo, ValidationError
from models.user import User

class RegisterForm(FlaskForm):
    """Registration form for new users."""
    username = StringField('Username', validators=[
        DataRequired(message="Username is required"),
        Length(min=3, max=30, message="Username must be between 3 and 30 characters")
    ])
    email = StringField('Email Address', validators=[
        DataRequired(message="Email is required"),
        Email(message="Please enter a valid email address")
    ])
    password = PasswordField('Password', validators=[
        DataRequired(message="Password is required"),
        Length(min=6, message="Password must be at least 6 characters long")
    ])
    confirm_password = PasswordField('Confirm Password', validators=[
        DataRequired(message="Please confirm your password"),
        EqualTo('password', message="Passwords do not match")
    ])
    submit = SubmitField('Create Account')

    def validate_password(self, password):
        import re
        p = password.data
        if not re.search(r"[a-z]", p):
            raise ValidationError("Password must contain at least one lowercase letter.")
        if not re.search(r"[A-Z]", p):
            raise ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r"[0-9]", p):
            raise ValidationError("Password must contain at least one number.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>_]", p):
            raise ValidationError("Password must contain at least one special character.")

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data.strip()).first()
        if user:
            raise ValidationError('Username is already taken.')

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data.strip().lower()).first()
        if user:
            raise ValidationError('Email address is already registered.')
