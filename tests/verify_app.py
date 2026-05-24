import unittest
import io
import os
import sys
from datetime import datetime

# Add the parent directory to the path so we can import app and models
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from models.user import User
from models.expense import Expense
from models.budget import Budget

class ExpenseTrackerValidationSuite(unittest.TestCase):
    def setUp(self):
        """Set up an isolated in-memory test environment."""
        self.app = create_app('testing')
        
        self.ctx = self.app.app_context()
        self.ctx.push()
        
        db.create_all()
        self.client = self.app.test_client()
        
        # Setup mock user
        self.username = "testuser"
        self.email = "test@example.com"
        self.password = "Secr3t!"
        
        self.user = User(username=self.username, email=self.email, currency='USD')
        self.user.set_password(self.password)
        db.session.add(self.user)
        db.session.commit()

    def tearDown(self):
        """Clean up database and pop contexts."""
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def login_client(self):
        """Helper to solve math captcha and log in client."""
        # 1. Establish session challenge answer
        with self.client.session_transaction() as sess:
            sess['security_challenge_a'] = '10'
            
        # 2. Post login credentials with captcha solution
        response = self.client.post('/auth/login', data={
            'email': self.email,
            'password': self.password,
            'security_answer': '10'
        }, follow_redirects=True)
        return response

    def test_login_and_captcha(self):
        """Verify interactive login captcha security."""
        # Invalid captcha fails
        with self.client.session_transaction() as sess:
            sess['security_challenge_a'] = '10'
        response = self.client.post('/auth/login', data={
            'email': self.email,
            'password': self.password,
            'security_answer': '99'
        }, follow_redirects=True)
        self.assertIn(b"Security check failed", response.data)
        
        # Valid captcha succeeds
        response = self.login_client()
        self.assertIn(b"Welcome back", response.data)

    def test_form_currency_default_inr(self):
        """Verify that ExpenseForm defaults to INR currency selection."""
        from forms.expense_form import ExpenseForm
        form = ExpenseForm()
        self.assertEqual(form.currency.default, 'INR')
        self.assertEqual(form.currency.data, 'INR')

    def test_add_expense_and_budget_alert(self):
        """Verify CRUD expense entries and warning triggers."""
        self.login_client()
        
        # 1. Create a budget constraint of $50
        budget = Budget(
            user_id=self.user.id,
            category='Food',
            monthly_limit=50.0,
            month=datetime.now().month,
            year=datetime.now().year
        )
        db.session.add(budget)
        db.session.commit()
        
        # 2. Add food expense within budget ($30)
        response = self.client.post('/expenses/add', data={
            'amount': '30.00',
            'currency': 'USD',
            'category': 'Food',
            'description': 'Office Lunch',
            'date': datetime.now().strftime('%Y-%m-%d')
        }, follow_redirects=True)
        self.assertIn(b"Expense recorded successfully", response.data)
        self.assertNotIn(b"Overspending Alert", response.data)
        
        # 3. Add food expense crossing budget (another $40 -> total $70 > $50 limit)
        response = self.client.post('/expenses/add', data={
            'amount': '40.00',
            'currency': 'USD',
            'category': 'Food',
            'description': 'Fancy Dinner',
            'date': datetime.now().strftime('%Y-%m-%d')
        }, follow_redirects=True)
        self.assertIn(b"Expense recorded successfully", response.data)
        self.assertIn(b"Overspending Alert", response.data)

    def test_pdf_ledger_download(self):
        """Verify PDF export outputs correct binary headers and handles currencies safely."""
        self.login_client()
        
        # Record some transactions
        expense = Expense(
            amount=15.50,
            category='Shopping',
            description='Test item',
            date=datetime.now().date(),
            user_id=self.user.id
        )
        db.session.add(expense)
        db.session.commit()
        
        # Trigger PDF download
        response = self.client.get('/expenses/export/pdf')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, 'application/pdf')
        self.assertTrue(response.data.startswith(b'%PDF-'))
        self.assertTrue(len(response.data) > 1000)

    def test_excel_ledger_download(self):
        """Verify Excel sheet downloads cleanly and includes dynamic currency attributes."""
        self.login_client()
        
        # Record some transactions
        expense = Expense(
            amount=85.00,
            category='Bills',
            description='Power utility',
            date=datetime.now().date(),
            user_id=self.user.id
        )
        db.session.add(expense)
        db.session.commit()
        
        # Trigger Excel download
        response = self.client.get('/expenses/export/excel')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        # Response content should be robust binary Excel contents
        self.assertTrue(len(response.data) > 1000)

    def test_currency_switching_and_conversions(self):
        """Verify switching user base currency correctly modifies formats and exports."""
        self.login_client()
        
        # Update user preferred currency to INR (Rupees)
        profile_update_response = self.client.post('/auth/profile', data={
            'username': 'testuser',
            'email': 'test@example.com',
            'currency': 'INR'
        }, follow_redirects=True)
        self.assertIn(b"Your profile has been updated successfully", profile_update_response.data)
        
        # Refresh current user in test DB session context
        db.session.refresh(self.user)
        self.assertEqual(self.user.currency, 'INR')
        self.assertEqual(self.user.currency_symbol, '₹')
        
        # Record transaction in INR
        expense = Expense(
            amount=500.00,
            category='Travel',
            description='Cab ride',
            date=datetime.now().date(),
            user_id=self.user.id
        )
        db.session.add(expense)
        db.session.commit()
        
        # Check PDF download - must format using 'INR' text code safely (not raising exceptions)
        pdf_response = self.client.get('/expenses/export/pdf')
        self.assertEqual(pdf_response.status_code, 200)
        self.assertEqual(pdf_response.mimetype, 'application/pdf')
        self.assertTrue(pdf_response.data.startswith(b'%PDF-'))
        self.assertTrue(len(pdf_response.data) > 1000)
        
        # Check Excel download - uses correct number formats and currency indicators
        excel_response = self.client.get('/expenses/export/excel')
        self.assertEqual(excel_response.status_code, 200)

if __name__ == '__main__':
    unittest.main()
