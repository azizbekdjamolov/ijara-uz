from rest_framework import generics, permissions
from rest_framework.parsers import FormParser, MultiPartParser

from apps.verification.models import VerificationDocument
from apps.verification.serializers import VerificationDocumentSerializer


class DocumentListCreateView(generics.ListCreateAPIView):
    """Upload/own listing of verification documents. Files are never served publicly."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VerificationDocumentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return VerificationDocument.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        document = serializer.save(user=self.request.user)
        from apps.ai.tasks import process_document_task

        process_document_task.delay(str(document.id))


class DocumentDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = VerificationDocumentSerializer

    def get_queryset(self):
        return VerificationDocument.objects.filter(user=self.request.user)
