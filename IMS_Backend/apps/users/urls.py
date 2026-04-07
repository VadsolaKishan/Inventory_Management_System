from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.users.views import AuthViewSet, UserViewSet

router = DefaultRouter()
router.register('auth', AuthViewSet, basename='auth')
router.register('users', UserViewSet, basename='users')

urlpatterns = [
    path('', include(router.urls)),
]
