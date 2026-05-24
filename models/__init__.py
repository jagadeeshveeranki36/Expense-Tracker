from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Import all models to ensure they register on the metadata
from models.user import User
from models.expense import Expense
from models.budget import Budget
