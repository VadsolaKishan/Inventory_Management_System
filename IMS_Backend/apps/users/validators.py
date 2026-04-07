import re

from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


PASSWORD_PATTERN = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$')


class StrongPasswordRegexValidator:
    def validate(self, password, user=None):
        if not PASSWORD_PATTERN.match(password or ''):
            raise ValidationError(
                _('Password does not meet security requirements.'),
                code='password_policy_violation',
            )

    def get_help_text(self):
        return _(
            'Use 8 to 20 characters with uppercase, lowercase, number, and a special character.'
        )
