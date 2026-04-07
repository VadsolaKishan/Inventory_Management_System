from django.db import migrations


def set_superusers_to_manager(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(is_superuser=True).exclude(role='manager').update(role='manager')


def revert_superusers_to_staff(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(is_superuser=True, role='manager').update(role='staff')


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_rbac_roles'),
    ]

    operations = [
        migrations.RunPython(set_superusers_to_manager, revert_superusers_to_staff),
    ]
