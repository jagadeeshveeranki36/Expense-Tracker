import unittest
import os
import sys
from datetime import datetime

# Add the parent directory to the path so we can import app and models
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from models.user import User

class MultiAccountSwitcherValidationSuite(unittest.TestCase):
    def setUp(self):
        """Set up an isolated in-memory test environment."""
        self.app = create_app('testing')
        
        self.ctx = self.app.app_context()
        self.ctx.push()
        
        db.create_all()
        self.client = self.app.test_client()
        
        # Setup mock user A
        self.userA = User(username="userA", email="usera@example.com", currency='USD', bank_name="Chase")
        self.userA.set_password("Password123!")
        db.session.add(self.userA)
        
        # Setup mock user B
        self.userB = User(username="userB", email="userb@example.com", currency='EUR', bank_name="Teal Bank")
        self.userB.set_password("Password123!")
        db.session.add(self.userB)
        
        db.session.commit()

    def tearDown(self):
        """Clean up database and pop contexts."""
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_multi_account_login_and_switching(self):
        """Verify that multiple bank accounts can be concurrently logged in, switch, and maintain session list."""
        
        # 1. Log in User A
        with self.client.session_transaction() as sess:
            sess['security_challenge_a'] = '15'
            
        response = self.client.post('/auth/login', data={
            'email': 'usera@example.com',
            'password': 'Password123!',
            'security_answer': '15'
        }, follow_redirects=True)
        self.assertIn(b"Welcome back, userA", response.data)
        
        # Verify User A is logged in and session has only User A's ID
        with self.client.session_transaction() as sess:
            logged_in_ids = sess.get('logged_in_user_ids', [])
            self.assertEqual(logged_in_ids, [self.userA.id])

        # 2. Add second bank account: Log in User B with add_account=1
        with self.client.session_transaction() as sess:
            sess['security_challenge_a'] = '20'
            
        response = self.client.post('/auth/login?add_account=1', data={
            'email': 'userb@example.com',
            'password': 'Password123!',
            'security_answer': '20'
        }, follow_redirects=True)
        self.assertIn(b"Welcome back, userB", response.data)
        
        # Verify both User A and User B are in the session list, and User B is currently active
        with self.client.session_transaction() as sess:
            logged_in_ids = sess.get('logged_in_user_ids', [])
            self.assertEqual(len(logged_in_ids), 2)
            self.assertIn(self.userA.id, logged_in_ids)
            self.assertIn(self.userB.id, logged_in_ids)
            
        # 3. Switch active user context to User A
        response = self.client.get(f'/auth/switch-account/{self.userA.id}', follow_redirects=True)
        self.assertIn(b"Switched to account: userA", response.data)
        
        # 4. Sign Out User A (current) and verify it switches back to User B
        response = self.client.get('/auth/logout', follow_redirects=True)
        self.assertIn(b"Signed out of previous account. Switched to userB (Teal Bank).", response.data)
        
        # Session should now only have User B
        with self.client.session_transaction() as sess:
            logged_in_ids = sess.get('logged_in_user_ids', [])
            self.assertEqual(logged_in_ids, [self.userB.id])

    def test_add_account_redirect_logic(self):
        """Verify that is_authenticated check allows access to login/register form when add_account=1 is set."""
        
        # Log in User A
        with self.client.session_transaction() as sess:
            sess['security_challenge_a'] = '15'
        self.client.post('/auth/login', data={
            'email': 'usera@example.com',
            'password': 'Password123!',
            'security_answer': '15'
        })
        
        # Try to access login page WITHOUT add_account=1. It should redirect to home page
        response = self.client.get('/auth/login', follow_redirects=False)
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.location.endswith('/dashboard') or response.location.endswith('/dashboard/'))
        
        # Try to access login page WITH add_account=1. It should allow showing the login page (status 200)
        response = self.client.get('/auth/login?add_account=1')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Sign In", response.data)

        # Try to access register page WITH add_account=1. It should allow showing the registration page (status 200)
        response = self.client.get('/auth/register?add_account=1')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Create Account", response.data)

if __name__ == '__main__':
    unittest.main()
