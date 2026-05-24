from flask import Blueprint, render_template
from flask_login import login_required

report_bp = Blueprint('report', __name__)

@report_bp.route('/')
@login_required
def index():
    """Renders the dynamic analytics and charts page."""
    return render_template('reports.html')
