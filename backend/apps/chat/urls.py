from django.urls import path

from apps.chat import views

urlpatterns = [
    path("unread-count/", views.UnreadCountView.as_view(), name="chat-unread-count"),
    path("conversations/", views.ConversationListCreateView.as_view(), name="chat-conversations"),
    path("conversations/<uuid:pk>/messages/", views.ConversationMessagesView.as_view(), name="chat-messages"),
    path("conversations/<uuid:pk>/messages/create/", views.MessageCreateView.as_view(), name="chat-send"),
    path("conversations/<uuid:pk>/messages/<uuid:message_pk>/", views.MessageDeleteView.as_view(), name="chat-message-delete"),
    path("conversations/<uuid:pk>/<str:action>/", views.ConversationActionView.as_view(), name="chat-action"),
]
