from django.db import migrations, models
import django.utils.timezone


def map_legacy_roles_to_rbac(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(role='inventory_manager').update(role='manager')
    User.objects.filter(role='warehouse_staff').update(role='staff')


def map_rbac_roles_to_legacy(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(role='manager').update(role='inventory_manager')
    User.objects.filter(role='staff').update(role='warehouse_staff')


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='created_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.RunPython(map_legacy_roles_to_rbac, map_rbac_roles_to_legacy),
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[('manager', 'Manager'), ('staff', 'Staff')],
                default='staff',
                max_length=32,
            ),
        ),
    ]
